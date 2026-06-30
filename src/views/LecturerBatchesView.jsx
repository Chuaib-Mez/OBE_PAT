/* ============================================================
   views/LecturerBatchesView.jsx — Espace enseignant (vue principale)

   Structure :
     Sidebar  : import/export, filtre enseignant (admin), liste des batches
     Contenu  :
       - En-tête batch + navigation semestre
       - Deux onglets Programme (filtrent les données par programme étudiant)
       - Graphique PO/Cours avec comparaison 4 ans
       - Tableau PO-first : PO → cours contributeurs → attainment + commentaire
       - Liste des étudiants (filtrée par programme)
       - Commentaire batch
   ============================================================ */

import { useRef } from 'react';
import AppBar from '../components/AppBar.jsx';
import BarsSVG from '../components/BarsSVG.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  POS, PO_LABELS, PASS, PROGRAMS, COMPARE_YEARS,
  semOrder, batchPO, courseAttainment, studentPO, avgOf, visibleBatches, makeHistory, wmean, mean,
} from '../data/index.js';

/* Couleurs pour les 4 années de comparaison (du plus récent au plus ancien) */
const YEAR_COLORS = ['#60a5fa', '#a78bfa', '#fb923c', '#94a3b8'];

/* ============================================================
   CALCULS FILTRÉS PAR PROGRAMME
   ============================================================ */

/* Attainment d'un cours pour les seuls étudiants d'un programme */
function courseAttForProg(code, studentIds, students) {
  const ids = studentIds.filter(id => code in (students[id]?.courseScores ?? {}));
  if (!ids.length) return null;
  return mean(ids.map(id => students[id].courseScores[code]));
}

/* Attainment de chaque PO pour les seuls étudiants d'un programme */
function batchPOForProg(studentIds, uptoSem, students, courses) {
  return POS.map((_, p) => {
    const pairs = courses
      .filter(c => c.w[p] > 0 && (uptoSem === 'all' || c.semester <= uptoSem))
      .map(c => {
        const att = courseAttForProg(c.code, studentIds, students);
        return att != null ? [att, c.w[p]] : null;
      })
      .filter(Boolean);
    return wmean(pairs);
  });
}


/* ============================================================
   VUE PRINCIPALE
   ============================================================ */

export default function LecturerBatchesView() {
  const { state, dispatch, toast, go } = useApp();
  const { lect, role, batches, students, courses, lecturers } = state;
  const fileRef = useRef(null);

  /* ---- Batch actif ---- */
  const vis     = visibleBatches(role, lect, batches);
  const batchId = vis.includes(lect.batch) ? lect.batch : (vis[0] || Object.keys(batches)[0]);
  const b       = batches[batchId];
  const order   = semOrder(b.progress);
  const sem     = order.includes(lect.sem) ? lect.sem : order[0];

  /* ---- Onglets programme ---- */
  const activeProgTab = lect.activeProgTab ?? 0;
  const prog1         = lect.prog1 ?? PROGRAMS[0];
  const prog2         = lect.prog2 ?? (PROGRAMS[1] || PROGRAMS[0]);
  const activeProgram = activeProgTab === 0 ? prog1 : prog2;

  /* Étudiants du batch appartenant au programme actif */
  const progStudentIds = b.students.filter(id => students[id]?.program === activeProgram);

  /* ---- Cours du semestre courant (tous, qu'il y ait des scores ou non) ---- */
  const semCourses = courses
    .filter(c => sem === 'all' || c.semester <= sem)
    .slice()
    .sort((a, b2) => a.semester - b2.semester);

  /* ---- Scores PO pour le programme actif ---- */
  const curPO  = batchPOForProg(progStudentIds, sem, students, courses);
  const overall = avgOf(curPO);

  /* ---- Historique simulé (4 ans) ---- */
  const history = makeHistory(curPO);

  /* ---- Mode du graphique : 'po' ou 'course' ---- */
  const chartMode = lect.chartMode ?? 'po';

  /* Séries pour le graphique PO */
  const poSeries = [
    { values: curPO, color: 'var(--teal)', stroke: 'var(--teal)', label: String(b.year) },
    ...COMPARE_YEARS.map((yr, k) => ({
      values: history[yr] || POS.map(() => 0),
      color: YEAR_COLORS[k], stroke: YEAR_COLORS[k], muted: true, label: String(yr),
    })),
  ];

  /* Séries pour le graphique par cours */
  const coursesWithData = semCourses.filter(c => courseAttForProg(c.code, progStudentIds, students) != null);
  const courseAtts      = coursesWithData.map(c => courseAttForProg(c.code, progStudentIds, students) ?? 0);
  const courseHistory   = makeHistory(courseAtts);
  const courseSeries    = [
    { values: courseAtts, color: 'var(--teal)', stroke: 'var(--teal)', label: String(b.year) },
    ...COMPARE_YEARS.map((yr, k) => ({
      values: courseHistory[yr] || [],
      color: YEAR_COLORS[k], stroke: YEAR_COLORS[k], muted: true, label: String(yr),
    })),
  ];
  const courseLabels = coursesWithData.map(c => c.code);

  /* Séries actives selon le mode graphique */
  const activeSeries = chartMode === 'po' ? poSeries : courseSeries;
  const activeLabels = chartMode === 'course' ? courseLabels : undefined;

  /* ---- Légende des années ---- */
  const yearLegend = [
    { color: 'var(--teal)', label: String(b.year) + ' (actuel)' },
    ...COMPARE_YEARS.map((yr, k) => ({ color: YEAR_COLORS[k], label: String(yr) })),
  ];

  /* ---- Rows pour le tableau PO-first ---- */
  const tableRows = [];
  POS.forEach((po, pi) => {
    const contributing = semCourses.filter(c => c.w[pi] > 0);
    if (!contributing.length) return;
    contributing.forEach((c, ci) => {
      tableRows.push({ po, pi, course: c, isFirst: ci === 0, span: contributing.length });
    });
  });

  /* ---- Navigation semestre ---- */
  const setSem = (d) => {
    let i = order.indexOf(sem);
    i = (i + d + order.length) % order.length;
    dispatch({ type: 'SET_LECT', patch: { sem: order[i] } });
  };

  const pickBatch = (id) =>
    dispatch({ type: 'SET_LECT', patch: { batch: id, sem: 1 } });

  const saveComment = () => {
    const el = document.getElementById('bcomment');
    dispatch({ type: 'SAVE_COMMENT', batchId, comment: el.value });
    toast('Commentaire sauvegardé');
  };

  /* ---- Export CSV ---- */
  const doExport = () => {
    const rows = [['Matric', 'Name', 'Course', 'Attainment']];
    b.students.forEach(id => {
      const s = students[id];
      Object.keys(s.courseScores).forEach(code =>
        rows.push([s.matric, s.name, code, s.courseScores[code]])
      );
    });
    const csv = rows
      .map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href   = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = b.name.replace(/\s/g, '_') + '_scores.csv';
    a.click();
    toast(`Export généré (${b.name})`);
  };

  /* ---- Import CSV ---- */
  const onImport = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
        const head  = lines.shift().split(',').map(h => h.trim().toLowerCase());
        const iM = head.indexOf('matric'), iN = head.indexOf('name'),
              iC = head.indexOf('course'), iA = head.indexOf('attainment');
        if (iM < 0 || iC < 0 || iA < 0) { toast('Colonnes requises : Matric, Name, Course, Attainment'); return; }
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
        toast(`${rows.length} lignes importées dans ${b.name}`);
      } catch { toast('Impossible de lire le fichier'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  /* ---- Style cellule header ---- */
  const th = { padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };

  return (
    <div className="view">
      <AppBar />
      <div className="wrap">

        <div className="page-head">
          <div>
            <h1>Lecturer space</h1>
            <div className="meta">Analyse PO par programme · comparaison 4 ans</div>
          </div>
        </div>

        <div className="ld">

          {/* ================================================================
              SIDEBAR
          ================================================================ */}
          <aside className="side">
            <div className="io">
              <button className="btn primary sm" onClick={() => fileRef.current?.click()}>⬆ Import CSV</button>
              <button className="btn sm" onClick={doExport}>⬇ Export CSV</button>
              <input ref={fileRef} type="file" accept=".csv" hidden onChange={onImport} />
            </div>

            {role === 'admin' && (
              <>
                <div className="label">Enseignant</div>
                <select
                  value={lect.filter}
                  onChange={e => dispatch({ type: 'SET_LECT', patch: { filter: e.target.value } })}
                  style={{ width: '100%', height: 34, border: '1px solid var(--line-2)', borderRadius: 8, padding: '0 8px', background: 'var(--surface)', marginBottom: 10, fontSize: 13 }}
                >
                  <option value="all">Tous les enseignants</option>
                  {Object.entries(lecturers).map(([id, l]) => (
                    <option key={id} value={id}>{l.name}</option>
                  ))}
                </select>
              </>
            )}

            <div className="label">Batches</div>
            <div className="blist">
              {vis.length ? vis.map(id => {
                const bt    = batches[id];
                const small = (role === 'admin' && lect.filter === 'all')
                  ? (lecturers[bt.owner]?.name ?? bt.session)
                  : bt.session;
                return (
                  <button key={id} className={`bitem ${id === batchId ? 'on' : ''}`} onClick={() => pickBatch(id)}>
                    <span>{bt.name}</span><small>{small}</small>
                  </button>
                );
              }) : <div className="empty">Aucun batch.</div>}
            </div>
          </aside>

          {/* ================================================================
              CONTENU PRINCIPAL
          ================================================================ */}
          <main>

            {/* En-tête batch + navigation semestre */}
            <div className="page-head" style={{ marginBottom: 14 }}>
              <div>
                <h1 style={{ fontSize: 18 }}>{b.name} · {b.year}</h1>
                <div className="meta mono">
                  {b.session} · {lecturers[b.owner]?.name ?? '—'} · moyenne {overall}%
                </div>
              </div>
              <div className="stepper">
                <button onClick={() => setSem(-1)}>‹</button>
                <span className="val mono">{sem === 'all' ? 'Cumulatif' : `Jusqu\'au sem. ${sem}`}</span>
                <button onClick={() => setSem(1)}>›</button>
              </div>
            </div>

            {/* ---- Onglets Programme ---- */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--line)', marginBottom: 16, gap: 0 }}>
              {[0, 1].map(tabIdx => {
                const prog    = tabIdx === 0 ? prog1 : prog2;
                const isActive = activeProgTab === tabIdx;
                return (
                  <div
                    key={tabIdx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', cursor: 'pointer',
                      borderBottom: isActive ? '2px solid var(--teal)' : '2px solid transparent',
                      marginBottom: -2,
                      background: isActive ? 'var(--surface)' : 'transparent',
                    }}
                    onClick={() => dispatch({ type: 'SET_LECT', patch: { activeProgTab: tabIdx } })}
                  >
                    <span style={{ fontWeight: isActive ? 600 : 400, fontSize: 13, color: isActive ? 'var(--teal)' : 'var(--ink-2)' }}>
                      {prog}
                    </span>
                    <select
                      value={prog}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        const patch = tabIdx === 0 ? { prog1: e.target.value } : { prog2: e.target.value };
                        dispatch({ type: 'SET_LECT', patch });
                      }}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--ink-3)', outline: 'none' }}
                    >
                      {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                );
              })}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: 4 }}>
                <span className="meta" style={{ fontSize: 12 }}>
                  {progStudentIds.length} étudiant{progStudentIds.length !== 1 ? 's' : ''} · {activeProgram}
                </span>
              </div>
            </div>

            {/* ================================================================
                GRAPHIQUE : PO ou Cours + comparaison 4 ans
            ================================================================ */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2>{chartMode === 'po' ? 'PO Attainment cumulatif' : 'Attainment par cours'} — {activeProgram}</h2>
                  <div className="sub">Comparaison avec les 4 dernières promotions · ligne rouge = seuil</div>
                </div>
                {/* Toggle By PO / By Course */}
                <div className="seg">
                  <button
                    className={chartMode === 'po' ? 'on' : ''}
                    onClick={() => dispatch({ type: 'SET_LECT', patch: { chartMode: 'po' } })}
                  >Par PO</button>
                  <button
                    className={chartMode === 'course' ? 'on' : ''}
                    onClick={() => dispatch({ type: 'SET_LECT', patch: { chartMode: 'course' } })}
                  >Par cours</button>
                </div>
              </div>

              {(chartMode === 'po' || coursesWithData.length > 0) ? (
                <BarsSVG
                  series={activeSeries}
                  labels={activeLabels}
                  rotateLabels={chartMode === 'course'}
                  height={chartMode === 'course' ? 300 : 268}
                />
              ) : (
                <div className="empty" style={{ padding: '32px 0' }}>
                  Aucun score disponible pour les cours de {activeProgram}.
                </div>
              )}

              {/* Légende */}
              <div className="legend" style={{ marginTop: 8, flexWrap: 'wrap', gap: '6px 16px' }}>
                {yearLegend.map(({ color, label }) => (
                  <span key={label}>
                    <span className="swatch" style={{ background: color }} />
                    {label}
                  </span>
                ))}
                <span><span className="swatch" style={{ background: 'var(--red)' }} />PO en dessous du seuil</span>
              </div>
            </div>


            {/* ================================================================
                TABLEAU PO-FIRST
                PO | Cours contributeurs | Attainment cours | Commentaire | Attainment PO | Statut
            ================================================================ */}
            <div className="card" style={{ marginTop: 16 }}>
              <h2>Analyse par PO — {activeProgram}</h2>
              <div className="sub">Chaque PO regroupe les cours qui y contribuent · commentaire modifiable par cours</div>

              <div className="gridtbl" style={{ marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--line)' }}>
                      <th style={{ ...th, minWidth: 110 }}>PO</th>
                      <th style={{ ...th, minWidth: 180 }}>Cours contributeur</th>
                      <th style={{ ...th, minWidth: 90, textAlign: 'right' }}>Attainment</th>
                      <th style={{ ...th, minWidth: 180 }}>Commentaire</th>
                      <th style={{ ...th, minWidth: 90, textAlign: 'right' }}>Att. PO</th>
                      <th style={{ ...th, minWidth: 70 }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.length > 0 ? tableRows.map((row, i) => {
                      const cAtt   = courseAttForProg(row.course.code, progStudentIds, students);
                      const poAtt  = curPO[row.pi];
                      const poHasData = poAtt > 0;

                      return (
                        <tr key={`${batchId}-${row.po}-${row.course.code}`} style={{ borderBottom: '1px solid var(--line)' }}>

                          {/* PO — affiché uniquement sur la première ligne du groupe */}
                          {row.isFirst && (
                            <td
                              rowSpan={row.span}
                              style={{ padding: '10px 8px', verticalAlign: 'top', background: 'var(--surface)', borderRight: '1px solid var(--line)' }}
                            >
                              <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{row.po}</div>
                              <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.3, marginTop: 2 }}>{PO_LABELS[row.pi]}</div>
                            </td>
                          )}

                          {/* Cours contributeur */}
                          <td style={{ padding: '8px 10px', fontSize: 13 }}>
                            <span className="mono" style={{ color: 'var(--ink-2)', fontSize: 12 }}>{row.course.code}</span>
                            <span style={{ color: 'var(--ink-3)', margin: '0 4px' }}>·</span>
                            {row.course.name}
                          </td>

                          {/* Attainment du cours */}
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 13, fontWeight: 500 }}>
                            {cAtt != null ? (
                              <span style={{ color: cAtt >= PASS ? 'var(--teal)' : 'var(--red)' }}>
                                {cAtt}%
                              </span>
                            ) : (
                              <span style={{ color: 'var(--ink-3)' }}>—</span>
                            )}
                          </td>

                          {/* Commentaire — textarea extensible, sauvegardé au blur */}
                          <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>
                            <textarea
                              key={`cc-${batchId}-${row.course.code}`}
                              defaultValue={b.courseComments?.[row.course.code] ?? ''}
                              onBlur={e => dispatch({ type: 'SAVE_COURSE_COMMENT', batchId, code: row.course.code, comment: e.target.value })}
                              placeholder="Commentaire…"
                              rows={2}
                              style={{
                                width: '100%', border: 'none', outline: 'none',
                                borderBottom: '1px solid var(--line)',
                                background: 'transparent', padding: '4px 2px',
                                fontSize: 12, lineHeight: 1.45,
                                fontFamily: 'var(--sans)',
                                resize: 'vertical', minHeight: 34,
                              }}
                            />
                          </td>

                          {/* Attainment PO — affiché uniquement sur la première ligne du groupe */}
                          {row.isFirst && (
                            <td
                              rowSpan={row.span}
                              style={{
                                padding: '10px 8px', textAlign: 'right', verticalAlign: 'middle',
                                fontWeight: 700, fontSize: 15,
                                color: !poHasData ? 'var(--ink-3)' : poAtt >= PASS ? 'var(--teal)' : 'var(--red)',
                              }}
                            >
                              {poHasData ? poAtt + '%' : '—'}
                            </td>
                          )}

                          {/* Statut PO — affiché uniquement sur la première ligne du groupe */}
                          {row.isFirst && (
                            <td rowSpan={row.span} style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                              {poHasData ? (
                                poAtt >= PASS
                                  ? <span className="tag ok">met</span>
                                  : <span className="tag no">below</span>
                              ) : (
                                <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="empty" style={{ padding: '24px 8px' }}>
                          Aucun cours dans le curriculum pour ce semestre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>


            {/* ================================================================
                LISTE DES ÉTUDIANTS (filtrée par programme)
            ================================================================ */}
            <div className="card" style={{ marginTop: 16 }}>
              <h2>Étudiants · {activeProgram} ({progStudentIds.length})</h2>
              <div className="sub">Cliquer sur une ligne pour éditer les scores</div>
              <table>
                <thead>
                  <tr>
                    <th>Matric</th><th>Nom</th>
                    <th style={{ textAlign: 'right' }}>Moyenne</th>
                    <th style={{ textAlign: 'right' }}>POs validés</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {progStudentIds.length ? progStudentIds.map(id => {
                    const s  = students[id];
                    const po = studentPO(s, sem, courses);
                    const ov = avgOf(po);
                    return (
                      <tr
                        key={id}
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
                    <tr><td colSpan={5} className="empty">Aucun étudiant {activeProgram} dans ce batch.</td></tr>
                  )}
                </tbody>
              </table>
            </div>


            {/* ================================================================
                COMMENTAIRE BATCH
            ================================================================ */}
            <div className="card comment" style={{ marginTop: 16 }}>
              <h2>Commentaire batch</h2>
              <div className="sub">Note globale pour ce batch (commune à tous les programmes)</div>
              <textarea
                id="bcomment"
                key={batchId}
                placeholder="Observations, points à améliorer, décisions pédagogiques…"
                defaultValue={b.comment}
              />
              <div className="row-end">
                <button className="btn primary sm" onClick={saveComment}>Sauvegarder</button>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
