/* ============================================================
   views/LecturerBatchesView.jsx — Espace enseignant (vue principale)
   Remplace la fonction viewLectBatches() de lecturer.js (version vanilla).

   Contient :
     - Une sidebar avec les boutons de sélection de batch, le filtre
       enseignant (admin uniquement) et les boutons import/export CSV
     - Un graphique en barres de l'atteinte PO du batch sélectionné
     - Un tableau des cours avec leur taux d'atteinte
     - Une zone de commentaire libre sur le batch
     - Une liste des étudiants du batch (cliquables vers la vue détail)
     - Un graphique global tous batches confondus
   ============================================================ */

import { useRef } from 'react';
import AppBar from '../components/AppBar.jsx';
import BarsSVG from '../components/BarsSVG.jsx';
import PoChips from '../components/PoChips.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  POS, PASS, COMPARE_YEARS,
  semOrder, batchPO, batchCourses, courseAttainment, studentPO, avgOf, visibleBatches,
} from '../data/index.js';

export default function LecturerBatchesView() {
  const { state, dispatch, toast, go } = useApp();
  const { lect, role, batches, students, courses, lecturers } = state;

  /* Référence à l'input fichier caché (déclenché par le bouton Import) */
  const fileRef = useRef(null);

  /* Détermine le batch actif (fallback sur le premier disponible si nécessaire) */
  const vis     = visibleBatches(role, lect, batches);
  const batchId = vis.includes(lect.batch) ? lect.batch : (vis[0] || Object.keys(batches)[0]);
  const b       = batches[batchId];
  const order   = semOrder(b.progress);
  const sem     = order.includes(lect.sem) ? lect.sem : order[0];

  /* Scores PO du batch et construction des séries pour le graphique */
  const cur    = batchPO(batchId, sem, batches, students, courses);
  const overall = avgOf(cur);
  const series = [{ values: cur, color: 'var(--teal)', stroke: 'var(--teal)' }];

  /* Ajout d'une série grisée si la comparaison par année est activée */
  if (lect.compare && b.history) {
    series.push({
      values: b.history[lect.compareYear] || POS.map(() => 0),
      color: 'var(--ink-3)', stroke: 'var(--ink-3)', muted: true,
    });
  }

  /* Navigation entre semestres (cyclique) */
  const setSem = (d) => {
    let i = order.indexOf(sem);
    i = (i + d + order.length) % order.length;
    dispatch({ type: 'SET_LECT', patch: { sem: order[i] } });
  };

  /* Sélection d'un batch dans la sidebar */
  const pickBatch = (id) =>
    dispatch({ type: 'SET_LECT', patch: { batch: id, compare: false, compareYear: 2025, sem: 1 } });

  /* Navigation entre les années de comparaison (bornée) */
  const cmpYear = (d) => {
    const y = Math.max(
      COMPARE_YEARS[COMPARE_YEARS.length - 1],
      Math.min(COMPARE_YEARS[0], lect.compareYear + d)
    );
    dispatch({ type: 'SET_LECT', patch: { compareYear: y } });
  };

  /* Sauvegarde du commentaire batch (lit la valeur du textarea par son id) */
  const saveComment = () => {
    const el = document.getElementById('bcomment');
    dispatch({ type: 'SAVE_COMMENT', batchId, comment: el.value });
    toast('Comment saved');
  };

  /* ---- Export CSV ---- */
  const doExport = () => {
    let rows = [['Matric', 'Name', 'Course', 'Attainment']];
    b.students.forEach(id => {
      const s = students[id];
      Object.keys(s.courseScores).forEach(code =>
        rows.push([s.matric, s.name, code, s.courseScores[code]])
      );
    });
    const csv = rows
      .map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(','))
      .join('\n');
    const a  = document.createElement('a');
    a.href   = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = b.name.replace(/\s/g, '_') + '_course_attainment.csv';
    a.click();
    toast(`Export generated (${b.name})`);
  };

  /* ---- Import CSV ---- */
  /* Lit et parse le fichier sélectionné, puis dispatch IMPORT_FILE */
  const onImport = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
        const head  = lines.shift().split(',').map(h => h.trim().toLowerCase());
        /* Détection des colonnes par leur en-tête */
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
        dispatch({ type: 'IMPORT_FILE', filename: f.name, batchId, rows });
        toast(`${rows.length} rows imported into ${b.name}`);
      } catch { toast('Could not read file'); }
    };
    reader.readAsText(f);
    e.target.value = ''; /* Réinitialise pour permettre de re-sélectionner le même fichier */
  };

  /* Cours et PO global pré-calculés pour les tableaux */
  const coursesInBatch = batchCourses(batchId, sem, batches, students, courses);
  const allBatchesPO   = POS.map((_, p) =>
    avgOf(
      Object.keys(batches)
        .map(id => batchPO(id, 'all', batches, students, courses)[p])
        .filter(v => v > 0)
    )
  );

  return (
    <div className="view">
      <AppBar />
      <div className="wrap">

        <div className="page-head">
          <div>
            <h1>Lecturer space</h1>
            <div className="meta">PO attainment computed from course attainment · comparison · comment</div>
          </div>
        </div>

        <div className="ld">

          {/* ---- Sidebar ---- */}
          <aside className="side">
            {/* Boutons Import / Export CSV */}
            <div className="io">
              <button className="btn primary sm" onClick={() => fileRef.current?.click()}>⬆ Import Excel</button>
              <button className="btn sm" onClick={doExport}>⬇ Export Excel</button>
              <input ref={fileRef} type="file" accept=".csv" hidden onChange={onImport} />
            </div>

            {/* Filtre par enseignant (admin uniquement) */}
            {role === 'admin' && (
              <>
                <div className="label">Lecturer</div>
                <select
                  value={lect.filter}
                  onChange={e => dispatch({ type: 'SET_LECT', patch: { filter: e.target.value } })}
                  style={{ width: '100%', height: 34, border: '1px solid var(--line-2)', borderRadius: 8, padding: '0 8px', background: 'var(--surface)', marginBottom: 10, fontSize: 13 }}
                >
                  <option value="all">All lecturers</option>
                  {Object.entries(lecturers).map(([id, l]) => (
                    <option key={id} value={id}>{l.name}</option>
                  ))}
                </select>
              </>
            )}

            {/* Liste des batches accessibles */}
            <div className="label">Batches</div>
            <div className="blist">
              {vis.length ? vis.map(id => {
                const bt    = batches[id];
                /* En mode admin "tous les enseignants" : affiche le nom du responsable */
                const small = (role === 'admin' && lect.filter === 'all')
                  ? (lecturers[bt.owner]?.name ?? bt.session)
                  : bt.session;
                return (
                  <button
                    key={id}
                    className={`bitem ${id === batchId ? 'on' : ''}`}
                    onClick={() => pickBatch(id)}
                  >
                    <span>{bt.name}</span><small>{small}</small>
                  </button>
                );
              }) : <div className="empty">No batch.</div>}
            </div>
          </aside>

          {/* ---- Contenu principal ---- */}
          <main>

            {/* En-tête du batch avec navigation semestre et toggle comparaison */}
            <div className="page-head" style={{ marginBottom: 14 }}>
              <div>
                <h1 style={{ fontSize: 18 }}>{b.name} · {b.year}</h1>
                <div className="meta mono">
                  {b.session} · {lecturers[b.owner]?.name ?? '—'} · average attainment {overall}%
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Toggle "comparer par année" */}
                <label className="tog" style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={lect.compare}
                    onChange={() => dispatch({ type: 'SET_LECT', patch: { compare: !lect.compare } })}
                  />
                  Compare by year
                </label>
                {/* Sélecteur d'année (visible si comparaison activée) */}
                {lect.compare && (
                  <div className="stepper" role="group" aria-label="Comparison year">
                    <button
                      onClick={() => cmpYear(-1)}
                      disabled={lect.compareYear <= COMPARE_YEARS[COMPARE_YEARS.length - 1]}
                    >‹</button>
                    <span className="val mono">{b.name} · {lect.compareYear}</span>
                    <button
                      onClick={() => cmpYear(1)}
                      disabled={lect.compareYear >= COMPARE_YEARS[0]}
                    >›</button>
                  </div>
                )}
                {/* Navigation entre semestres */}
                <div className="stepper">
                  <button onClick={() => setSem(-1)}>‹</button>
                  <span className="val mono">{sem === 'all' ? 'Cumulative' : `Up to sem ${sem}`}</span>
                  <button onClick={() => setSem(1)}>›</button>
                </div>
              </div>
            </div>

            {/* Graphique en barres : atteinte PO du batch */}
            <div className="card">
              <h2>Cumulative PO attainment (%)</h2>
              <div className="sub">One bar per PO · red line = passing threshold</div>
              <BarsSVG series={series} />
              <div className="legend">
                <span><span className="swatch" style={{ background: 'var(--teal)' }} />{b.name} · {b.year}</span>
                {lect.compare && (
                  <span><span className="swatch" style={{ background: 'var(--line-2)' }} />{b.name} · {lect.compareYear}</span>
                )}
                <span><span className="swatch" style={{ background: 'var(--red)' }} />PO below threshold</span>
              </div>
            </div>

            {/* Tableau des cours avec leur contribution aux POs */}
            <div className="card" style={{ marginTop: 16 }}>
              <h2>Course attainment</h2>
              <div className="sub">PO attainment above = average of the courses contributing to each PO</div>
              <table>
                <thead>
                  <tr>
                    <th>Sem</th><th>Code</th><th>Course</th>
                    <th>Contributes to</th>
                    <th style={{ textAlign: 'right' }}>Attainment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesInBatch.length ? coursesInBatch.map(c => {
                    const att = courseAttainment(batchId, c.code, batches, students);
                    const ok  = att >= PASS;
                    return (
                      <tr key={c.code}>
                        <td className="mono">S{c.semester}</td>
                        <td className="mono">{c.code}</td>
                        <td>{c.name}</td>
                        <td><PoChips w={c.w} /></td>
                        <td className="num">{att == null ? '—' : att + '%'}</td>
                        <td>
                          {att == null ? '' : ok
                            ? <span className="tag ok">met</span>
                            : <span className="tag no">below</span>}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={6} className="empty">No course data for this batch yet.</td></tr>
                  )}
                </tbody>
              </table>
              <div className="meta" style={{ marginTop: 8 }}>
                Course attainment = average of the students' scores for that course. Edit individual students below.
              </div>
            </div>

            {/* Zone de commentaire libre au niveau du batch */}
            <div className="card comment" style={{ marginTop: 16 }}>
              <h2>Batch comment</h2>
              <div className="sub">One note at batch level (not per student)</div>
              {/* defaultValue utilisé pour éviter que React contrôle le textarea (le contenu peut changer de batch) */}
              <textarea
                id="bcomment"
                placeholder="Observations, areas to improve, teaching decisions…"
                defaultValue={b.comment}
              />
              <div className="row-end">
                <button className="btn primary sm" onClick={saveComment}>Save comment</button>
              </div>
            </div>

            {/* Liste des étudiants du batch */}
            <div className="card" style={{ marginTop: 16 }}>
              <h2>Batch students ({b.students.length})</h2>
              <div className="sub">Click a row to view and edit course scores</div>
              <table>
                <thead>
                  <tr>
                    <th>Matric</th><th>Name</th>
                    <th style={{ textAlign: 'right' }}>Average</th>
                    <th style={{ textAlign: 'right' }}>POs met</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {b.students.length ? b.students.map(id => {
                    const s  = students[id];
                    const po = studentPO(s, sem, courses);
                    const ov = avgOf(po);
                    return (
                      <tr
                        key={id}
                        /* Navigue vers la vue détail de l'étudiant au clic */
                        onClick={() => { dispatch({ type: 'SET_LECT', patch: { studentId: id } }); go('lect-student'); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="mono">{s.matric}</td>
                        <td>{s.name}</td>
                        <td className="num">{ov}%</td>
                        <td className="num">{po.filter(v => v >= PASS).length}/11</td>
                        <td style={{ color: 'var(--ink-3)' }}>›</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className="empty">No student — import an Excel file.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Vue globale : moyenne PO sur tous les batches confondus */}
            <div className="card" style={{ marginTop: 16 }}>
              <h2>Overall PO attainment — all batches</h2>
              <div className="sub">Global average per PO across all batches</div>
              <BarsSVG series={[{ values: allBatchesPO, color: 'var(--teal)', stroke: 'var(--teal)' }]} />
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
