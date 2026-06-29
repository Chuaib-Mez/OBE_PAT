/* ============================================================
   views/AdminView.jsx — Console d'administration (Registrar)
   Quatre sections :
     1. Gestion des utilisateurs (import Excel + tableau + changement de rôle)
     2. Assignation des batches aux enseignants
     3. Matrice CO-PO éditable
     4. Registre des fichiers de scores importés
   ============================================================ */

import { useRef } from 'react';
import AppBar from '../components/AppBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { POS, PO_LABELS, PASS } from '../data/index.js';

export default function AdminView() {
  const { state, dispatch, toast } = useApp();
  const { admin, courses, lecturers, batches, students, imports } = state;

  /* Refs pour les fichiers cachés */
  const stuFileRef  = useRef(null); /* Import Excel étudiants */
  const lecFileRef  = useRef(null); /* Import Excel enseignants */
  const scoreFileRef = useRef(null); /* Import CSV scores */

  /* Refs pour le formulaire "Ajouter un cours" */
  const codeRef = useRef(null);
  const nameRef = useRef(null);
  const semRef  = useRef(null);


  /* ============================================================
     IMPORT EXCEL — ÉTUDIANTS
     Format attendu : nom, prenom, batch, programme
     Le matricule est généré automatiquement.
  ============================================================ */
  const onImportStudents = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
        const head  = lines.shift().split(',').map(h => h.trim().toLowerCase());
        /* Détection des colonnes */
        const iN = head.indexOf('nom'), iP = head.indexOf('prenom'),
              iB = head.indexOf('batch'), iPr = head.indexOf('programme');
        if (iN < 0 || iP < 0) { toast('Colonnes requises : nom, prenom, batch, programme'); return; }

        const rows = [];
        lines.forEach(l => {
          const c         = l.split(',');
          const lastName  = (c[iN]  || '').trim();
          const firstName = (c[iP]  || '').trim();
          const batchId   = (c[iB]  || '').trim().toUpperCase();
          const program   = (c[iPr] || '').trim();
          if (!lastName && !firstName) return;
          rows.push({ firstName, lastName, batchId, program });
        });

        dispatch({ type: 'IMPORT_STUDENTS_EXCEL', rows });
        toast(`${rows.length} étudiant(s) importé(s)`);
      } catch { toast('Impossible de lire le fichier'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  };


  /* ============================================================
     IMPORT EXCEL — ENSEIGNANTS
     Format attendu : nom, prenom, cours (séparés par "|"), batch
  ============================================================ */
  const onImportLecturers = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
        const head  = lines.shift().split(',').map(h => h.trim().toLowerCase());
        const iN = head.indexOf('nom'), iP = head.indexOf('prenom'),
              iC = head.indexOf('cours'), iB = head.indexOf('batch');
        if (iN < 0 || iP < 0) { toast('Colonnes requises : nom, prenom, cours, batch'); return; }

        const rows = [];
        lines.forEach(l => {
          const c         = l.split(',');
          const lastName  = (c[iN] || '').trim();
          const firstName = (c[iP] || '').trim();
          /* Les cours sont séparés par "|" dans leur cellule : "CS101|CS210" */
          const courses   = iC >= 0 ? (c[iC] || '').split('|').map(x => x.trim().toUpperCase()).filter(Boolean) : [];
          const batchId   = iB >= 0 ? (c[iB] || '').trim().toUpperCase() : '';
          if (!lastName && !firstName) return;
          rows.push({ firstName, lastName, courses, batchId });
        });

        dispatch({ type: 'IMPORT_LECTURERS_EXCEL', rows });
        toast(`${rows.length} enseignant(s) importé(s)`);
      } catch { toast('Impossible de lire le fichier'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  };


  /* ============================================================
     IMPORT CSV SCORES (section fichiers importés)
  ============================================================ */
  const onAdminImport = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
        const head  = lines.shift().split(',').map(h => h.trim().toLowerCase());
        const iM = head.indexOf('matric'), iN = head.indexOf('name'),
              iC = head.indexOf('course'), iA = head.indexOf('attainment');
        if (iM < 0 || iC < 0 || iA < 0) { toast('Expected: Matric,Name,Course,Attainment'); return; }
        const rows = [];
        lines.forEach(l => {
          const c      = l.split(',');
          const matric = (c[iM] || '').trim();
          const course = (c[iC] || '').trim().toUpperCase();
          if (!matric || !course) return;
          const att = Math.max(0, Math.min(100, parseInt(c[iA], 10) || 0));
          rows.push({ matric, name: iN >= 0 ? (c[iN] || matric).trim() : matric, course, att });
        });
        dispatch({ type: 'IMPORT_FILE', filename: f.name, batchId: admin.targetBatch, rows });
        toast(`${rows.length} scores importés`);
      } catch { toast('Impossible de lire le fichier'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  /* Téléchargement d'un fichier de scores */
  const dlFile = (id) => {
    const f = imports.find(x => x.id === id);
    if (!f) return;
    let rows = [['Matric', 'Name', 'Course', 'Attainment']];
    f.rows.forEach(r => rows.push([r.matric, r.name, r.course, r.att]));
    const csv = rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n');
    const a = document.createElement('a');
    a.href   = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = f.filename.replace(/\.[^.]+$/, '') + '.csv';
    a.click();
    toast('Download: ' + f.filename);
  };

  /* Ajout d'un cours dans la matrice CO-PO */
  const addCourse = () => {
    const code = (codeRef.current?.value || '').trim();
    const name = (nameRef.current?.value || '').trim();
    const sem  = Math.max(1, Math.min(8, parseInt(semRef.current?.value || 1, 10)));
    if (!code && !name) { toast('Enter a code and name'); return; }
    dispatch({ type: 'ADD_COURSE', code, name, sem });
    toast('Course added');
    if (codeRef.current) codeRef.current.value = '';
    if (nameRef.current) nameRef.current.value = '';
    if (semRef.current)  semRef.current.value  = '';
  };

  /* Liste combinée de tous les utilisateurs pour le tableau de gestion */
  const allStudents  = Object.values(students);
  const allLecturers = Object.values(lecturers);

  /* Fichier sélectionné pour la prévisualisation */
  const sel = admin.fileId ? imports.find(f => f.id === admin.fileId) : null;

  return (
    <div className="view">
      <AppBar />
      <div className="wrap">

        <div className="page-head">
          <div>
            <h1>Administration console</h1>
            <div className="meta">Registrar · gestion des utilisateurs, curriculum et fichiers importés</div>
          </div>
        </div>


        {/* ============================================================
            SECTION 1 — GESTION DES UTILISATEURS
        ============================================================ */}
        <div className="card">
          <div className="page-head" style={{ marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 15 }}>User management</h2>
              <div className="sub">Import des étudiants et enseignants · gestion des rôles</div>
            </div>
            {/* Boutons d'import */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <button className="btn primary sm" onClick={() => stuFileRef.current?.click()}>
                  ⬆ Import étudiants
                </button>
                <div className="meta" style={{ marginTop: 3 }}>Format : nom, prenom, batch, programme</div>
                <input ref={stuFileRef} type="file" accept=".csv" hidden onChange={onImportStudents} />
              </div>
              <div>
                <button className="btn sm" onClick={() => lecFileRef.current?.click()}>
                  ⬆ Import enseignants
                </button>
                <div className="meta" style={{ marginTop: 3 }}>Format : nom, prenom, cours, batch</div>
                <input ref={lecFileRef} type="file" accept=".csv" hidden onChange={onImportLecturers} />
              </div>
            </div>
          </div>

          {/* Tableau de tous les utilisateurs */}
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Rôle</th>
                <th>Détails</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Étudiants */}
              {allStudents.map(s => (
                <tr key={s.id}>
                  <td>{s.lastName || '—'}</td>
                  <td>{s.firstName || s.name}</td>
                  <td><span className="pill">Student</span></td>
                  <td className="meta">
                    {s.matric} · {batches[s.batch]?.name ?? s.batch} · {s.program || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn ghost sm"
                      onClick={() => { dispatch({ type: 'SET_USER_ROLE', userId: s.id, currentRole: 'student', newRole: 'lecturer' }); toast(`${s.name} → Lecturer`); }}
                    >
                      → Make lecturer
                    </button>
                  </td>
                </tr>
              ))}
              {/* Enseignants */}
              {allLecturers.map(l => (
                <tr key={l.id}>
                  <td>{l.lastName || '—'}</td>
                  <td>{l.firstName || l.name}</td>
                  <td><span className="pill amber">Lecturer</span></td>
                  <td className="meta">
                    {l.login} · {batches[l.batch]?.name ?? (l.batch || '—')} · {l.courses?.length ? l.courses.join(', ') : 'No courses'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn ghost sm"
                      onClick={() => { dispatch({ type: 'SET_USER_ROLE', userId: l.id, currentRole: 'lecturer', newRole: 'student' }); toast(`${l.name} → Student`); }}
                    >
                      → Make student
                    </button>
                  </td>
                </tr>
              ))}
              {/* État vide */}
              {!allStudents.length && !allLecturers.length && (
                <tr><td colSpan={5} className="empty">Aucun utilisateur. Importez un fichier Excel.</td></tr>
              )}
            </tbody>
          </table>
        </div>


        {/* ============================================================
            SECTION 2 — ASSIGNATION DES BATCHES AUX ENSEIGNANTS
        ============================================================ */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="page-head" style={{ marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 15 }}>Lecturers & batches</h2>
              <div className="sub">Assign each batch to its responsible lecturer</div>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Batch</th><th>Year</th><th>Session</th><th style={{ textAlign: 'right' }}>Students</th><th>Responsible lecturer</th></tr>
            </thead>
            <tbody>
              {Object.entries(batches).map(([id, b]) => (
                <tr key={id}>
                  <td>{b.name}</td>
                  <td className="mono">{b.year}</td>
                  <td className="mono">{b.session}</td>
                  <td className="num">{b.students.length}</td>
                  <td>
                    <select
                      value={b.owner}
                      onChange={e => { dispatch({ type: 'SET_BATCH_OWNER', batchId: id, lid: e.target.value }); toast('Assignment updated'); }}
                      style={{ height: 32, border: '1px solid var(--line-2)', borderRadius: 8, padding: '0 8px', background: 'var(--surface)', fontSize: 13 }}
                    >
                      {Object.entries(lecturers).map(([lid, l]) => (
                        <option key={lid} value={lid}>{l.name}</option>
                      ))}
                      {!Object.keys(lecturers).length && <option value="">— No lecturer —</option>}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* ============================================================
            SECTION 3 — MATRICE CO-PO
        ============================================================ */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="page-head" style={{ marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 15 }}>Courses & PO mapping</h2>
              <div className="sub">CO-PO matrix · coefficient 0 = pas de contribution · atteinte PO = moyenne pondérée</div>
            </div>
          </div>
          <div className="po-legend">
            {POS.map((p, i) => <span key={p} title={PO_LABELS[i]}><b>{p}</b> {PO_LABELS[i]}</span>)}
          </div>
          <div className="gridtbl">
            <table className="matrix">
              <thead>
                <tr>
                  <th className="semcol" style={{ minWidth: 200 }}>PO / Course</th>
                  {courses.map((c, ci) => {
                    const editing = admin.editSemCi === ci;
                    return (
                      <th key={c.code} style={{ textAlign: 'center', minWidth: 120 }}>
                        <div className="mono" style={{ fontWeight: 600 }}>{c.code}</div>
                        <div className="ts" style={{ color: 'var(--ink-3)', fontWeight: 400 }}>{c.name}</div>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                          {editing ? (
                            <>
                              <span className="ts" style={{ color: 'var(--ink-3)' }}>Semester</span>
                              <input className="cell-in" style={{ width: 40 }} type="number" min={1} max={8} defaultValue={c.semester}
                                onChange={e => dispatch({ type: 'SET_COURSE_SEM', ci, val: e.target.value })} />
                              <button className="btn ghost sm" style={{ padding: '2px 6px' }}
                                onClick={() => dispatch({ type: 'SET_ADMIN', patch: { editSemCi: -1 } })} aria-label="Done">✓</button>
                            </>
                          ) : (
                            <>
                              <span className="ts" style={{ color: 'var(--ink-2)' }}>Semester {c.semester}</span>
                              <button className="btn ghost sm" style={{ padding: '2px 6px' }}
                                onClick={() => dispatch({ type: 'SET_ADMIN', patch: { editSemCi: ci } })} aria-label="Edit semester">✎</button>
                            </>
                          )}
                        </div>
                        <div style={{ marginTop: 3 }}>
                          <button className="btn ghost sm" style={{ padding: '2px 7px' }}
                            onClick={() => { dispatch({ type: 'DEL_COURSE', ci }); toast('Course deleted'); }}
                            aria-label="Delete course">✕</button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {POS.map((p, pi) => (
                  <tr key={p}>
                    <td className="semcol" style={{ minWidth: 200 }}>
                      <b className="mono">{p}</b>
                      <span className="ts" style={{ color: 'var(--ink-3)' }}>{PO_LABELS[pi]}</span>
                    </td>
                    {courses.map((c, ci) => (
                      <td key={c.code} style={{ textAlign: 'center' }}>
                        <input className={`cell-in wcell ${c.w[pi] > 0 ? 'on' : ''}`} type="number" min={0} step={1}
                          defaultValue={c.w[pi] || 0}
                          onChange={e => dispatch({ type: 'SET_COURSE_W', ci, pi, val: e.target.value })} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="addrow">
            <input ref={codeRef} className="cell-in" style={{ width: 96, textAlign: 'left' }} placeholder="Code (e.g. CS401)" />
            <input ref={nameRef} className="cell-in" style={{ width: 230, textAlign: 'left' }} placeholder="Course name" />
            <input ref={semRef}  className="cell-in" style={{ width: 60 }} type="number" min={1} max={8} placeholder="Sem" />
            <button className="btn primary sm" onClick={addCourse}>+ Add course</button>
            <span className="meta">then enter coefficients in the matrix</span>
          </div>
        </div>


        {/* ============================================================
            SECTION 4 — REGISTRE DES FICHIERS DE SCORES
        ============================================================ */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="page-head" style={{ marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 15 }}>Imported score files</h2>
              <div className="sub">Registre complet · voir, télécharger, supprimer</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={admin.targetBatch}
                onChange={e => dispatch({ type: 'SET_ADMIN', patch: { targetBatch: e.target.value } })}
                style={{ height: 34, border: '1px solid var(--line-2)', borderRadius: 8, padding: '0 8px', background: 'var(--surface)' }}
              >
                {Object.entries(batches).map(([id, b]) => (
                  <option key={id} value={id}>{b.name} · {b.year}</option>
                ))}
              </select>
              <button className="btn primary sm" onClick={() => scoreFileRef.current?.click()}>⬆ Import scores</button>
              <input ref={scoreFileRef} type="file" accept=".csv" hidden onChange={onAdminImport} />
            </div>
          </div>
          <table>
            <thead>
              <tr><th>File</th><th>Batch</th><th>Imported on</th><th style={{ textAlign: 'right' }}>Rows</th><th /></tr>
            </thead>
            <tbody>
              {imports.length ? imports.map(f => (
                <tr key={f.id} className={f.id === admin.fileId ? 'on' : ''}>
                  <td className="mono">{f.filename}</td>
                  <td>{batches[f.batch]?.name ?? f.batch}</td>
                  <td className="mono">{f.importedAt}</td>
                  <td className="num">{f.rows.length}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button className="btn ghost sm" onClick={() => dispatch({ type: 'SET_ADMIN', patch: { fileId: f.id } })}>View</button>
                    <button className="btn ghost sm" onClick={() => dlFile(f.id)}>Download</button>
                    <button className="btn ghost sm" onClick={() => { dispatch({ type: 'DEL_FILE', id: f.id }); toast('File deleted'); }}>Delete</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="empty">No file imported.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Prévisualisation du fichier de scores sélectionné */}
        {sel && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="page-head" style={{ marginBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: 15 }}>Preview — {sel.filename}</h2>
                <div className="sub">{batches[sel.batch]?.name ?? sel.batch} · {sel.rows.length} rows</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sm" onClick={() => dlFile(sel.id)}>⬇ Download</button>
                <button className="btn ghost sm" onClick={() => dispatch({ type: 'SET_ADMIN', patch: { fileId: null } })}>Close</button>
              </div>
            </div>
            <div className="gridtbl">
              <table>
                <thead><tr><th className="semcol">Matric</th><th>Name</th><th>Course</th><th>Attainment</th></tr></thead>
                <tbody>
                  {sel.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="semcol mono">{r.matric}</td>
                      <td>{r.name}</td>
                      <td className="mono">{r.course}</td>
                      <td className="num" style={r.att < PASS ? { color: 'var(--red)' } : {}}>{r.att}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
