import { useRef } from 'react';
import AppBar from '../components/AppBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { POS, PO_LABELS, PASS } from '../data/index.js';

export default function AdminView() {
  const { state, dispatch, toast } = useApp();
  const { admin, courses, lecturers, batches, imports } = state;
  const fileRef = useRef(null);
  const codeRef = useRef(null);
  const nameRef = useRef(null);
  const semRef = useRef(null);

  const addCourse = () => {
    const code = (codeRef.current?.value || '').trim();
    const name = (nameRef.current?.value || '').trim();
    const sem  = Math.max(1, Math.min(8, parseInt(semRef.current?.value || 1, 10)));
    if (!code && !name) { toast('Enter a code and name'); return; }
    dispatch({ type: 'ADD_COURSE', code, name, sem });
    toast('Course added');
    if (codeRef.current) codeRef.current.value = '';
    if (nameRef.current) nameRef.current.value = '';
    if (semRef.current) semRef.current.value = '';
  };

  const dlFile = (id) => {
    const f = imports.find(x => x.id === id);
    if (!f) return;
    let rows = [['Matric', 'Name', 'Course', 'Attainment']];
    f.rows.forEach(r => rows.push([r.matric, r.name, r.course, r.att]));
    const csv = rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = f.filename.replace(/\.[^.]+$/, '') + '.csv';
    a.click();
    toast('Download: ' + f.filename);
  };

  const onAdminImport = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
        const head = lines.shift().split(',').map(h => h.trim().toLowerCase());
        const iM = head.indexOf('matric'), iN = head.indexOf('name'), iC = head.indexOf('course'), iA = head.indexOf('attainment');
        if (iM < 0 || iC < 0 || iA < 0) { toast('Expected: Matric,Name,Course,Attainment'); return; }
        const rows = [];
        lines.forEach(l => {
          const c = l.split(',');
          const matric = (c[iM] || '').trim();
          const course = (c[iC] || '').trim().toUpperCase();
          if (!matric || !course) return;
          const att = Math.max(0, Math.min(100, parseInt(c[iA], 10) || 0));
          rows.push({ matric, name: iN >= 0 ? (c[iN] || matric).trim() : matric, course, att });
        });
        dispatch({ type: 'IMPORT_FILE', filename: f.name, batchId: admin.targetBatch, rows });
        toast(`${rows.length} rows imported`);
      } catch { toast('Could not read file'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  /* File preview */
  const sel = admin.fileId ? imports.find(f => f.id === admin.fileId) : null;

  return (
    <div className="view">
      <AppBar />
      <div className="wrap">
        <div className="page-head">
          <div>
            <h1>Administration console</h1>
            <div className="meta">Registrar · curriculum & imported files</div>
          </div>
        </div>

        {/* Lecturers & batches */}
        <div className="card">
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
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CO-PO matrix */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="page-head" style={{ marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 15 }}>Courses & PO mapping</h2>
              <div className="sub">CO-PO matrix · enter a coefficient (0 = no contribution) · PO attainment = weighted average</div>
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
                              <input
                                className="cell-in"
                                style={{ width: 40 }}
                                type="number"
                                min={1}
                                max={8}
                                defaultValue={c.semester}
                                onChange={e => dispatch({ type: 'SET_COURSE_SEM', ci, val: e.target.value })}
                              />
                              <button className="btn ghost sm" style={{ padding: '2px 6px' }} onClick={() => dispatch({ type: 'SET_ADMIN', patch: { editSemCi: -1 } })} aria-label="Done">✓</button>
                            </>
                          ) : (
                            <>
                              <span className="ts" style={{ color: 'var(--ink-2)' }}>Semester {c.semester}</span>
                              <button className="btn ghost sm" style={{ padding: '2px 6px' }} onClick={() => dispatch({ type: 'SET_ADMIN', patch: { editSemCi: ci } })} aria-label="Edit semester">✎</button>
                            </>
                          )}
                        </div>
                        <div style={{ marginTop: 3 }}>
                          <button className="btn ghost sm" style={{ padding: '2px 7px' }} onClick={() => { dispatch({ type: 'DEL_COURSE', ci }); toast('Course deleted'); }} aria-label="Delete course">✕</button>
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
                        <input
                          className={`cell-in wcell ${c.w[pi] > 0 ? 'on' : ''}`}
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={c.w[pi] || 0}
                          onChange={e => dispatch({ type: 'SET_COURSE_W', ci, pi, val: e.target.value })}
                        />
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
            <input ref={semRef} className="cell-in" style={{ width: 60 }} type="number" min={1} max={8} placeholder="Sem" />
            <button className="btn primary sm" onClick={addCourse}>+ Add course</button>
            <span className="meta">then enter coefficients in the matrix</span>
          </div>
        </div>

        {/* Imported files */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="page-head" style={{ marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 15 }}>Imported Excel files</h2>
              <div className="sub">Full registry · view, download, delete</div>
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
              <button className="btn primary sm" onClick={() => fileRef.current?.click()}>⬆ Import</button>
              <input ref={fileRef} type="file" accept=".csv" hidden onChange={onAdminImport} />
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
              )) : (
                <tr><td colSpan={5} className="empty">No file imported.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* File preview */}
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
