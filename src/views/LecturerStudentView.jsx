import { useRef } from 'react';
import AppBar from '../components/AppBar.jsx';
import RadarSVG from '../components/RadarSVG.jsx';
import PoChips from '../components/PoChips.jsx';
import { useApp } from '../context/AppContext.jsx';
import { PASS, studentPO, studentCourses, avgOf } from '../data/index.js';

export default function LecturerStudentView() {
  const { state, dispatch, toast, go } = useApp();
  const { lect, students, batches, courses } = state;
  const s = students[lect.studentId];
  const all = studentPO(s, 'all', courses);
  const stuCourses = studentCourses(s, courses);
  const localScores = useRef({ ...s.courseScores });

  const idx = batches[s.batch].students.indexOf(s.id);
  const total = batches[s.batch].students.length;

  const navStu = (d) => {
    const ids = batches[s.batch].students;
    const i = ids.indexOf(s.id) + d;
    if (i < 0 || i >= ids.length) return;
    dispatch({ type: 'SET_LECT', patch: { studentId: ids[i] } });
  };

  const cellEdit = (code, val) => {
    localScores.current[code] = Math.max(0, Math.min(100, parseInt(val || 0, 10)));
  };

  const saveScores = () => {
    dispatch({ type: 'UPDATE_STUDENT_SCORES', id: s.id, scores: { ...localScores.current } });
    toast('Scores saved');
  };

  return (
    <div className="view">
      <AppBar />
      <div className="wrap">
        <div className="page-head">
          <div>
            <button className="btn ghost sm" onClick={() => go('lect-batches')}>‹ {batches[s.batch].name}</button>
            <h1 style={{ marginTop: 8 }}>{s.name}</h1>
            <div className="meta mono">{s.matric} · average {avgOf(all)}%</div>
          </div>
          <div className="stepper">
            <button onClick={() => navStu(-1)} disabled={idx <= 0}>‹ Previous</button>
            <span className="val">{idx + 1} / {total}</span>
            <button onClick={() => navStu(1)} disabled={idx >= total - 1}>Next ›</button>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <h2>Course attainment (editable)</h2>
            <div className="sub">Enter the student's attainment per course · POs are computed from it</div>
            <div className="gridtbl">
              <table>
                <thead>
                  <tr><th className="semcol">Sem</th><th>Code</th><th>Course</th><th>Contributes to</th><th>%</th></tr>
                </thead>
                <tbody>
                  {stuCourses.map(c => {
                    const v = s.courseScores[c.code];
                    return (
                      <tr key={c.code}>
                        <td className="semcol mono">S{c.semester}</td>
                        <td className="mono">{c.code}</td>
                        <td>{c.name}</td>
                        <td><PoChips w={c.w} /></td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            className={`cell-in ${v < PASS ? 'under' : ''}`}
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={v}
                            onChange={e => cellEdit(c.code, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="row-end">
              <button className="btn sm" onClick={() => go('lect-student')}>Cancel</button>
              <button className="btn primary sm" onClick={saveScores}>Save</button>
            </div>
          </div>

          <div className="card">
            <h2>Radar — student average</h2>
            <div className="sub">Recomputed on save</div>
            <RadarSVG series={[{ values: all, color: 'var(--teal)', stroke: 'var(--teal)' }]} width={320} height={300} />
            <div className="legend">
              <span><span className="swatch" style={{ background: 'var(--teal)' }} />Average across courses</span>
              <span><span className="dash-key" />Threshold 50%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
