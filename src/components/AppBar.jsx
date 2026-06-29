import { useApp } from '../context/AppContext.jsx';

export default function AppBar() {
  const { state, dispatch, go } = useApp();
  const { view, role, student, lect, lecturers, students, batches } = state;

  if (view === 'login') return null;

  const roleTag = role === 'student'
    ? <><span className="pill">Student</span><span>{students[student.id]?.name}</span></>
    : role === 'admin'
    ? <><span className="pill blue">Admin</span><span>Registrar</span></>
    : <><span className="pill amber">Lecturer</span><span>{lecturers[lect.lecturer]?.name ?? 'Lecturer'}</span></>;

  const adminStudentView = () => {
    const firstId = student.id && students[student.id] ? student.id : Object.keys(students)[0];
    dispatch({ type: 'SET_STUDENT', patch: { id: firstId } });
    go('student');
  };

  return (
    <div className="appbar">
      <div className="brand">
        <span className="dot" />
        <span>PO Attainment Tracker</span>
        <small>OBE</small>
      </div>

      {role === 'admin' && (
        <nav className="topnav">
          <button className={view === 'admin' ? 'on' : ''} onClick={() => go('admin')}>Console</button>
          <button className={view.startsWith('lect') ? 'on' : ''} onClick={() => go('lect-batches')}>Lecturer</button>
          <button className={view === 'student' ? 'on' : ''} onClick={adminStudentView}>Student</button>
        </nav>
      )}

      <div className="spacer" />
      <div className="ctx">{roleTag}</div>
      <button className="linkbtn" onClick={() => dispatch({ type: 'LOGOUT' })}>Sign out</button>
    </div>
  );
}
