/* ============================================================
   components/AppBar.jsx — Barre de navigation supérieure
   Remplace la fonction appbar() de state.js (version vanilla).

   Affiche :
     - Le logo / titre de l'application (gauche)
     - Les onglets de navigation (uniquement en mode admin, centre)
     - Le badge de rôle + nom de l'utilisateur (droite)
     - Le bouton "Sign out" (droite)

   Invisible sur la vue de connexion (view === 'login').
   ============================================================ */

import { useApp } from '../context/AppContext.jsx';

export default function AppBar() {
  const { state, dispatch, go } = useApp();
  const { view, role, student, lect, lecturers, students, batches } = state;

  /* Pas de barre sur la page de connexion */
  if (view === 'login') return null;

  /* Badge affiché à droite selon le rôle connecté */
  const roleTag = role === 'student'
    ? <><span className="pill">Student</span><span>{students[student.id]?.name}</span></>
    : role === 'admin'
    ? <><span className="pill blue">Admin</span><span>Registrar</span></>
    : <><span className="pill amber">Lecturer</span><span>{lecturers[lect.lecturer]?.name ?? 'Lecturer'}</span></>;

  /*
    En mode admin : accès à la vue étudiant via le bouton "Student".
    Si l'étudiant mémorisé n'existe plus, on prend le premier disponible.
  */
  const adminStudentView = () => {
    const firstId = student.id && students[student.id] ? student.id : Object.keys(students)[0];
    dispatch({ type: 'SET_STUDENT', patch: { id: firstId } });
    go('student');
  };

  return (
    <div className="appbar">
      {/* Logo et titre */}
      <div className="brand">
        <span className="dot" />
        <span>PO Attainment Tracker</span>
        <small>OBE</small>
      </div>

      {/* Onglets de navigation (admin uniquement) */}
      {role === 'admin' && (
        <nav className="topnav">
          <button className={view === 'admin'         ? 'on' : ''} onClick={() => go('admin')}>Console</button>
          <button className={view.startsWith('lect')  ? 'on' : ''} onClick={() => go('lect-batches')}>Lecturer</button>
          <button className={view === 'student'       ? 'on' : ''} onClick={adminStudentView}>Student</button>
        </nav>
      )}

      <div className="spacer" />

      {/* Identité de l'utilisateur connecté */}
      <div className="ctx">{roleTag}</div>

      {/* Bouton de déconnexion — dispatch LOGOUT vers le reducer */}
      <button className="linkbtn" onClick={() => dispatch({ type: 'LOGOUT' })}>Sign out</button>
    </div>
  );
}
