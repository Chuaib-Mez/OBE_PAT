/* ============================================================
   views/LecturerStudentView.jsx — Vue détail d'un étudiant (enseignant)

   Structure :
     - En-tête : retour batch, nom étudiant, navigation suivant/précédent
     - Carte radar + résumé POs
     - Tableau PO-first (même logique que la vue batch) :
         PO | Cours contributeur | Score (éditable) | Commentaire | Att. PO | Statut
   Les scores sont mis à jour via localScores.current (pas de re-rendu
   à chaque frappe). Sauvegarde explicite via UPDATE_STUDENT_SCORES.
   ============================================================ */

import { useRef } from 'react';
import AppBar from '../components/AppBar.jsx';
import RadarSVG from '../components/RadarSVG.jsx';
import { useApp } from '../context/AppContext.jsx';
import { POS, PO_LABELS, PASS, studentPO, studentCourses, avgOf } from '../data/index.js';

export default function LecturerStudentView() {
  const { state, dispatch, toast, go } = useApp();
  const { lect, students, batches, courses } = state;

  const s          = students[lect.studentId];
  const b          = batches[s.batch];
  const stuCourses = studentCourses(s, courses);
  const all        = studentPO(s, 'all', courses);
  const overall    = avgOf(all);

  /* Scores locaux — pas de re-rendu à chaque frappe */
  const localScores = useRef({ ...s.courseScores });

  /* Navigation dans le batch */
  const idx   = b.students.indexOf(s.id);
  const total = b.students.length;
  const navStu = (d) => {
    const ids = b.students;
    const i   = ids.indexOf(s.id) + d;
    if (i < 0 || i >= ids.length) return;
    localScores.current = { ...students[ids[i]].courseScores };
    dispatch({ type: 'SET_LECT', patch: { studentId: ids[i] } });
  };

  const cellEdit = (code, val) => {
    localScores.current[code] = Math.max(0, Math.min(100, parseInt(val || 0, 10)));
  };

  const saveScores = () => {
    dispatch({ type: 'UPDATE_STUDENT_SCORES', id: s.id, scores: { ...localScores.current } });
    toast('Scores sauvegardés');
  };

  /* ---- Construction des lignes du tableau PO-first ---- */
  const tableRows = [];
  POS.forEach((po, pi) => {
    const contributing = stuCourses.filter(c => c.w[pi] > 0);
    if (!contributing.length) return;
    contributing.forEach((c, ci) => {
      tableRows.push({ po, pi, course: c, isFirst: ci === 0, span: contributing.length });
    });
  });

  const th = {
    padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
  };

  return (
    <div className="view">
      <AppBar />
      <div className="wrap">

        {/* ---- En-tête ---- */}
        <div className="page-head">
          <div>
            <button className="btn ghost sm" onClick={() => go('lect-batches')}>
              ‹ {b.name}
            </button>
            <h1 style={{ marginTop: 8 }}>{s.name}</h1>
            <div className="meta mono">
              {s.matric} · {s.program} · moyenne {overall}%
            </div>
          </div>
          <div className="stepper">
            <button onClick={() => navStu(-1)} disabled={idx <= 0}>‹ Précédent</button>
            <span className="val">{idx + 1} / {total}</span>
            <button onClick={() => navStu(1)} disabled={idx >= total - 1}>Suivant ›</button>
          </div>
        </div>

        {/* ---- Radar + résumé ---- */}
        <div className="card">
          <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <RadarSVG
              series={[{ values: all, color: 'var(--teal)', stroke: 'var(--teal)' }]}
              width={280}
              height={260}
            />
            <div>
              <div style={{ fontSize: 38, fontWeight: 700, color: overall >= PASS ? 'var(--teal)' : 'var(--red)', lineHeight: 1 }}>
                {overall}%
              </div>
              <div className="sub" style={{ marginBottom: 14 }}>moyenne globale PO</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="tag ok" style={{ width: 'fit-content' }}>
                  {all.filter(v => v >= PASS).length} PO validés
                </span>
                <span className="tag no" style={{ width: 'fit-content' }}>
                  {all.filter(v => v > 0 && v < PASS).length} PO sous le seuil
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                  {all.filter(v => v === 0).length} PO sans données
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================
            TABLEAU PO-FIRST
            PO | Cours contributeur | Score | Commentaire | Att. PO | Statut
        ================================================================ */}
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2>Détail par PO — {s.name}</h2>
              <div className="sub">Scores éditables · PO calculé depuis les cours · commentaire par cours</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm" onClick={() => { localScores.current = { ...s.courseScores }; go('lect-batches'); }}>
                Annuler
              </button>
              <button className="btn primary sm" onClick={saveScores}>Sauvegarder</button>
            </div>
          </div>

          <div className="gridtbl">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <th style={{ ...th, minWidth: 110 }}>PO</th>
                  <th style={{ ...th, minWidth: 180 }}>Cours contributeur</th>
                  <th style={{ ...th, minWidth: 80, textAlign: 'center' }}>Score</th>
                  <th style={{ ...th, minWidth: 180 }}>Commentaire</th>
                  <th style={{ ...th, minWidth: 90, textAlign: 'right' }}>Att. PO</th>
                  <th style={{ ...th, minWidth: 70 }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length > 0 ? tableRows.map(row => {
                  const score     = s.courseScores[row.course.code];
                  const poAtt     = all[row.pi];
                  const poHasData = poAtt > 0;

                  return (
                    <tr key={`${s.id}-${row.po}-${row.course.code}`} style={{ borderBottom: '1px solid var(--line)' }}>

                      {/* PO — première ligne du groupe uniquement */}
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

                      {/* Score éditable */}
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <input
                          className={`cell-in ${score != null && score < PASS ? 'under' : ''}`}
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={score ?? ''}
                          onChange={e => cellEdit(row.course.code, e.target.value)}
                        />
                      </td>

                      {/* Commentaire batch — éditable, sauvegardé au blur */}
                      <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>
                        <textarea
                          key={`cc-${s.batch}-${row.course.code}`}
                          defaultValue={b.courseComments?.[row.course.code] ?? ''}
                          onBlur={e => dispatch({ type: 'SAVE_COURSE_COMMENT', batchId: s.batch, code: row.course.code, comment: e.target.value })}
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

                      {/* Attainment PO — première ligne du groupe uniquement */}
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

                      {/* Statut — première ligne du groupe uniquement */}
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
                      Aucun score pour cet étudiant — importez des données via la liste du batch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
