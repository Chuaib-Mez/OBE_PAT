/* ============================================================
   views/StudentView.jsx — Tableau de bord étudiant
   Remplace la fonction viewStudent() de student.js (version vanilla).

   Contient :
     - Un radar comparant les scores PO de l'étudiant avec la moyenne du batch
     - Des toggles pour afficher/masquer chaque série sur le radar
     - Un résumé (moyenne globale + nombre de POs atteints)
     - Un tableau détaillé PO par PO avec statut (met / below threshold)

   En mode admin : un sélecteur permet de basculer entre tous les étudiants.
   ============================================================ */

import AppBar from '../components/AppBar.jsx';
import RadarSVG from '../components/RadarSVG.jsx';
import { useApp } from '../context/AppContext.jsx';
import { POS, PO_LABELS, PASS, semOrder, studentPO, batchPO, avgOf } from '../data/index.js';

export default function StudentView() {
  const { state, dispatch } = useApp();
  const { student, role, students, batches, courses } = state;

  const stu  = students[student.id];
  const prog = batches[stu.batch].progress;
  const order = semOrder(prog);

  /* Si le semestre mémorisé n'existe plus (ex: changement d'étudiant), on repart du début */
  const sem = order.includes(student.sem) ? student.sem : order[0];

  /* Calcul des scores PO : ceux de l'étudiant et la moyenne du batch */
  const mine    = studentPO(stu, sem, courses);
  const avg     = batchPO(stu.batch, sem, batches, students, courses);
  const overall = avgOf(mine);

  /* Construction des séries du radar selon les toggles activés */
  const series = [];
  if (student.showMine) series.push({ values: mine, color: 'var(--teal)',  stroke: 'var(--teal)',  fill: 0.16 });
  if (student.showAvg)  series.push({ values: avg,  color: 'var(--amber)', stroke: 'var(--amber)', fill: 0.10 });

  /* Navigation entre semestres (cyclique) */
  const setSem = (d) => {
    let i = order.indexOf(sem);
    i = (i + d + order.length) % order.length;
    dispatch({ type: 'SET_STUDENT', patch: { sem: order[i] } });
  };

  return (
    <div className="view">
      <AppBar />
      <div className="wrap">

        <div className="page-head">
          <div>
            <h1>Dashboard</h1>
            {/* En mode admin : sélecteur pour choisir n'importe quel étudiant */}
            {role === 'admin' ? (
              <select
                value={student.id}
                onChange={e => dispatch({ type: 'SET_STUDENT', patch: { id: e.target.value, sem: 1 } })}
                style={{ marginTop: 6, height: 32, border: '1px solid var(--line-2)', borderRadius: 8, padding: '0 8px', background: 'var(--surface)', fontSize: 13 }}
              >
                {Object.values(students).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.matric} · {batches[s.batch].name}
                  </option>
                ))}
              </select>
            ) : (
              /* En mode étudiant : affichage statique de ses informations */
              <div className="meta mono">{stu.name} · {stu.matric} · {batches[stu.batch].name}</div>
            )}
          </div>

          {/* Sélecteur de semestre (navigation ‹ ... ›) */}
          <div className="stepper" role="group" aria-label="Semester">
            <button onClick={() => setSem(-1)} aria-label="Previous semester">‹</button>
            <span className="val mono">
              {sem === 'all' ? 'All semesters' : `Up to semester ${sem}`}
            </span>
            <button onClick={() => setSem(1)} aria-label="Next semester">›</button>
          </div>
        </div>

        <div className="grid-2">

          {/* Graphique radar */}
          <div className="card">
            <h2>Radar — PO attainment</h2>
            <div className="sub">Each PO = average of contributing course scores</div>
            <RadarSVG series={series} />
            <div className="legend">
              <span><span className="swatch" style={{ background: 'var(--teal)' }} />My scores</span>
              <span><span className="swatch" style={{ background: 'var(--amber)' }} />Batch average</span>
              <span><span className="dash-key" />Passing line</span>
            </div>
          </div>

          <div>
            {/* Toggles : choisir ce qu'on affiche sur le radar */}
            <div className="card" style={{ marginBottom: 16 }}>
              <h2>Display</h2>
              <div className="sub">What to show on the radar</div>
              <div className="toggles">
                <label className="tog">
                  <input
                    type="checkbox"
                    checked={student.showMine}
                    onChange={() => dispatch({ type: 'SET_STUDENT', patch: { showMine: !student.showMine } })}
                  />
                  <span className="swatch" style={{ background: 'var(--teal)' }} />My scores
                </label>
                <label className="tog">
                  <input
                    type="checkbox"
                    checked={student.showAvg}
                    onChange={() => dispatch({ type: 'SET_STUDENT', patch: { showAvg: !student.showAvg } })}
                  />
                  <span className="swatch" style={{ background: 'var(--amber)' }} />Batch average
                </label>
              </div>
            </div>

            {/* Résumé chiffré */}
            <div className="card">
              <h2>Summary</h2>
              <div className="sub">Current selection</div>
              <div style={{ display: 'flex', gap: 22, alignItems: 'baseline' }}>
                <div>
                  <div className="mono" style={{ fontSize: 30, fontWeight: 600, color: 'var(--teal-2)' }}>{overall}%</div>
                  <div className="meta">average attainment</div>
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 30, fontWeight: 600 }}>
                    {mine.filter(v => v >= PASS).length}/11
                  </div>
                  <div className="meta">POs met</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau détaillé : score perso, moyenne batch, statut par PO */}
        <div className="card" style={{ marginTop: 18 }}>
          <h2>PO breakdown</h2>
          <div className="sub">My scores vs batch average</div>
          <table>
            <thead>
              <tr>
                <th>PO</th>
                <th>Outcome</th>
                <th style={{ textAlign: 'right' }}>My score</th>
                <th style={{ textAlign: 'right' }}>Batch avg</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {POS.map((po, i) => {
                const v  = mine[i];
                const ok = v >= PASS;
                return (
                  <tr key={po}>
                    <td className="mono">{po}</td>
                    <td style={{ color: 'var(--ink-3)' }}>{PO_LABELS[i]}</td>
                    <td className="num">{v.toFixed(2)}</td>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>{avg[i].toFixed(0)}</td>
                    <td>
                      {ok
                        ? <span className="tag ok">met</span>
                        : <span className="tag no">below threshold</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
