/* ============================================================
   views/AdminView.jsx — Console d'administration (Registrar)
   Sections :
     1. User management  — tableau Excel inline éditable
     2. Lecturers & batches — assignation
     3. CO-PO matrix — curriculum
     4. Imported score files — registre CSV
   ============================================================ */

import { useRef, useState } from 'react';
import AppBar from '../components/AppBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { POS, PO_LABELS, PASS, PROGRAMS } from '../data/index.js';


/* ============================================================
   COMPOSANTS CELLULE
   Inputs/selects qui ressemblent à des cellules de tableur :
   fond transparent, bordure basse uniquement au focus.
============================================================ */

function CellInput({ value, onChange, placeholder, readOnly, mono }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        border: 'none',
        borderBottom: focused ? '1.5px solid var(--teal)' : '1.5px solid transparent',
        background: focused ? 'var(--surface)' : 'transparent',
        padding: '5px 8px',
        fontSize: 13,
        fontFamily: mono ? 'var(--mono)' : 'var(--sans)',
        color: readOnly ? 'var(--ink-3)' : 'var(--ink)',
        outline: 'none',
        borderRadius: 0,
        cursor: readOnly ? 'default' : 'text',
        boxSizing: 'border-box',
      }}
    />
  );
}

function CellSelect({ value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value ?? ''}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        border: 'none',
        borderBottom: focused ? '1.5px solid var(--teal)' : '1.5px solid transparent',
        background: focused ? 'var(--surface)' : 'transparent',
        padding: '5px 8px',
        fontSize: 13,
        color: 'var(--ink)',
        outline: 'none',
        cursor: 'pointer',
        boxSizing: 'border-box',
        appearance: 'auto',
      }}
    >
      {children}
    </select>
  );
}


/* ============================================================
   LIGNE UTILISATEUR (une ligne = un user dans le tableau)
============================================================ */

function UserRow({ user, role, batches, dispatch, toast }) {
  /* Raccourci pour dispatcher une mise à jour partielle */
  const upd = (patch) =>
    dispatch({ type: role === 'student' ? 'UPDATE_STUDENT' : 'UPDATE_LECTURER', id: user.id, patch });

  return (
    <tr style={{ borderBottom: '1px solid var(--line)' }}>

      {/* Nom */}
      <td style={{ padding: 0, minWidth: 120 }}>
        <CellInput
          value={user.lastName}
          onChange={e => upd({ lastName: e.target.value })}
          placeholder="Nom"
        />
      </td>

      {/* Prénom */}
      <td style={{ padding: 0, minWidth: 120 }}>
        <CellInput
          value={user.firstName}
          onChange={e => upd({ firstName: e.target.value })}
          placeholder="Prénom"
        />
      </td>

      {/* Rôle — liste déroulante */}
      <td style={{ padding: 0, minWidth: 110 }}>
        <CellSelect
          value={role}
          onChange={e => dispatch({ type: 'SET_USER_ROLE', userId: user.id, currentRole: role, newRole: e.target.value })}
        >
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
        </CellSelect>
      </td>

      {/* Batch — liste déroulante */}
      <td style={{ padding: 0, minWidth: 110 }}>
        <CellSelect
          value={user.batch}
          onChange={e => upd({ batch: e.target.value })}
        >
          {Object.entries(batches).map(([id, b]) => (
            <option key={id} value={id}>{b.name}</option>
          ))}
        </CellSelect>
      </td>

      {/* Programme (étudiant) ou Cours enseignés (enseignant) */}
      <td style={{ padding: 0, minWidth: 160 }}>
        {role === 'student' ? (
          /* Étudiant : liste déroulante des programmes */
          <CellSelect
            value={user.program}
            onChange={e => upd({ program: e.target.value })}
          >
            {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
          </CellSelect>
        ) : (
          /* Enseignant : codes des cours séparés par des virgules */
          <CellInput
            value={user.courses?.join(', ')}
            onChange={e => upd({ courses: e.target.value.split(',').map(x => x.trim().toUpperCase()).filter(Boolean) })}
            placeholder="CS101, CS210…"
          />
        )}
      </td>

      {/* Matricule (étudiant, éditable) ou Login (enseignant, généré automatiquement) */}
      <td style={{ padding: 0, minWidth: 120 }}>
        {role === 'student' ? (
          <CellInput
            value={user.matric}
            onChange={e => upd({ matric: e.target.value })}
            placeholder="Matricule"
            mono
          />
        ) : (
          <CellInput
            value={user.login}
            readOnly
            mono
          />
        )}
      </td>

      {/* Bouton supprimer */}
      <td style={{ padding: '0 6px', textAlign: 'center', minWidth: 40 }}>
        <button
          className="btn ghost sm"
          style={{ padding: '2px 7px', color: 'var(--red)' }}
          onClick={() => {
            dispatch({ type: 'DELETE_USER', userId: user.id, role });
            toast('User deleted');
          }}
          aria-label="Delete user"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}


/* ============================================================
   VUE PRINCIPALE
============================================================ */

export default function AdminView() {
  const { state, dispatch, toast } = useApp();
  const { admin, courses, lecturers, batches, students, imports } = state;

  const stuFileRef   = useRef(null);
  const lecFileRef   = useRef(null);
  const scoreFileRef = useRef(null);
  const codeRef      = useRef(null);
  const nameRef      = useRef(null);
  const semRef       = useRef(null);

  /* Liste combinée triée par nom de famille */
  const allUsers = [
    ...Object.values(students).map(s => ({ ...s, _role: 'student' })),
    ...Object.values(lecturers).map(l => ({ ...l, _role: 'lecturer' })),
  ].sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));


  /* ---- Import Excel étudiants ---- */
  const onImportStudents = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
        const head  = lines.shift().split(',').map(h => h.trim().toLowerCase());
        const iN = head.indexOf('nom'), iP = head.indexOf('prenom'),
              iB = head.indexOf('batch'), iPr = head.indexOf('programme');
        if (iN < 0 || iP < 0) { toast('Colonnes requises : nom, prenom, batch, programme'); return; }
        const rows = [];
        lines.forEach(l => {
          const c = l.split(',');
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

  /* ---- Import Excel enseignants ---- */
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

  /* ---- Import CSV scores ---- */
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
          rows.push({ matric, name: iN >= 0 ? (c[iN] || matric).trim() : matric, course, att: Math.max(0, Math.min(100, parseInt(c[iA], 10) || 0)) });
        });
        dispatch({ type: 'IMPORT_FILE', filename: f.name, batchId: admin.targetBatch, rows });
        toast(`${rows.length} scores importés`);
      } catch { toast('Impossible de lire le fichier'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  const dlFile = (id) => {
    const f = imports.find(x => x.id === id);
    if (!f) return;
    const rows = [['Matric', 'Name', 'Course', 'Attainment'], ...f.rows.map(r => [r.matric, r.name, r.course, r.att])];
    const csv  = rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = f.filename.replace(/\.[^.]+$/, '') + '.csv';
    a.click();
    toast('Download: ' + f.filename);
  };

  const addCourse = () => {
    const code = (codeRef.current?.value || '').trim();
    const name = (nameRef.current?.value || '').trim();
    const sem  = Math.max(1, Math.min(8, parseInt(semRef.current?.value || 1, 10)));
    if (!code && !name) { toast('Enter a code and name'); return; }
    dispatch({ type: 'ADD_COURSE', code, name, sem });
    toast('Course added');
    [codeRef, nameRef, semRef].forEach(r => { if (r.current) r.current.value = ''; });
  };

  const sel = admin.fileId ? imports.find(f => f.id === admin.fileId) : null;

  return (
    <div className="view">
      <AppBar />
      <div className="wrap">

        <div className="page-head">
          <div>
            <h1>Administration console</h1>
            <div className="meta">Registrar · gestion des utilisateurs, curriculum et fichiers</div>
          </div>
        </div>


        {/* ============================================================
            SECTION 1 — USER MANAGEMENT (interface Excel)
        ============================================================ */}
        <div className="card">
          <div className="page-head" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 15 }}>User management</h2>
              <div className="sub">Toutes les cellules sont éditables directement · rôle modifiable via liste déroulante</div>
            </div>
            {/* Boutons d'import et d'ajout de ligne */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ textAlign: 'center' }}>
                <button className="btn sm" onClick={() => stuFileRef.current?.click()}>⬆ Étudiants</button>
                <div className="meta" style={{ fontSize: 11, marginTop: 2 }}>nom, prenom, batch, programme</div>
                <input ref={stuFileRef} type="file" accept=".csv" hidden onChange={onImportStudents} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <button className="btn sm" onClick={() => lecFileRef.current?.click()}>⬆ Enseignants</button>
                <div className="meta" style={{ fontSize: 11, marginTop: 2 }}>nom, prenom, cours, batch</div>
                <input ref={lecFileRef} type="file" accept=".csv" hidden onChange={onImportLecturers} />
              </div>
              <button className="btn primary sm" onClick={() => dispatch({ type: 'ADD_USER' })}>+ Add row</button>
            </div>
          </div>

          {/* Tableau Excel */}
          <div className="gridtbl">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <th style={thStyle}>Nom</th>
                  <th style={thStyle}>Prénom</th>
                  <th style={thStyle}>Rôle</th>
                  <th style={thStyle}>Batch</th>
                  <th style={thStyle}>Programme / Cours</th>
                  <th style={thStyle}>Matric / Login</th>
                  <th style={{ ...thStyle, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {allUsers.length ? allUsers.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    role={u._role}
                    batches={batches}
                    dispatch={dispatch}
                    toast={toast}
                  />
                )) : (
                  <tr>
                    <td colSpan={7} className="empty" style={{ padding: '16px 8px' }}>
                      Aucun utilisateur. Importez un fichier ou cliquez sur "+ Add row".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


        {/* ============================================================
            SECTION 2 — ASSIGNATION BATCHES / ENSEIGNANTS
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
                      {Object.entries(lecturers).map(([lid, l]) => <option key={lid} value={lid}>{l.name}</option>)}
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
              <div className="sub">CO-PO matrix · coefficient 0 = no contribution</div>
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
                                onClick={() => dispatch({ type: 'SET_ADMIN', patch: { editSemCi: -1 } })}>✓</button>
                            </>
                          ) : (
                            <>
                              <span className="ts" style={{ color: 'var(--ink-2)' }}>Semester {c.semester}</span>
                              <button className="btn ghost sm" style={{ padding: '2px 6px' }}
                                onClick={() => dispatch({ type: 'SET_ADMIN', patch: { editSemCi: ci } })}>✎</button>
                            </>
                          )}
                        </div>
                        <div style={{ marginTop: 3 }}>
                          <button className="btn ghost sm" style={{ padding: '2px 7px' }}
                            onClick={() => { dispatch({ type: 'DEL_COURSE', ci }); toast('Course deleted'); }}>✕</button>
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
            SECTION 4 — FICHIERS DE SCORES
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
                {Object.entries(batches).map(([id, b]) => <option key={id} value={id}>{b.name} · {b.year}</option>)}
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

        {/* Prévisualisation fichier scores */}
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

/* Style partagé pour les en-têtes de colonnes du tableau Excel */
const thStyle = {
  padding: '8px 8px 8px 9px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  background: 'var(--surface)',
};
