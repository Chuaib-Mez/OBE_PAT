/* ============================================================
   views/Login.jsx — Page de connexion
   Trois rôles : Student (par matricule), Lecturer (par login),
   Admin (login + mot de passe vérifiés contre ADMIN_CREDENTIALS).
   ============================================================ */

import { useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { lecturerBatches, ADMIN_CREDENTIALS } from '../data/index.js';

export default function Login() {
  const { state, dispatch, toast } = useApp();
  const { loginRole, lecturers, students, batches } = state;
  const idRef = useRef(null);
  const pwRef = useRef(null);

  const setRole = (role) => dispatch({ type: 'SET_LOGIN_ROLE', role });

  const doLogin = () => {
    if (loginRole === 'student') {
      /* Recherche par matricule, insensible à la casse */
      const id  = (idRef.current?.value || '').trim().toUpperCase();
      const stu = Object.values(students).find(s => s.matric.toUpperCase() === id);
      if (!stu) { toast('No student found for this matric'); return; }
      dispatch({ type: 'LOGIN', role: 'student', studentId: stu.id });

    } else if (loginRole === 'admin') {
      /* Vérification des identifiants admin */
      const login = (idRef.current?.value || '').trim();
      const pw    = (pwRef.current?.value || '').trim();
      if (login !== ADMIN_CREDENTIALS.login || pw !== ADMIN_CREDENTIALS.password) {
        toast('Invalid credentials');
        return;
      }
      dispatch({ type: 'LOGIN', role: 'admin' });

    } else {
      /* Enseignant : recherche par login, ouvre son premier batch */
      const idv      = (idRef.current?.value || '').trim().toLowerCase();
      const entry    = Object.entries(lecturers).find(([, l]) => l.login === idv);
      const lecturer = entry ? entry[0] : Object.keys(lecturers)[0];
      const batch    = lecturerBatches(lecturer, batches)[0] || Object.keys(batches)[0];
      dispatch({ type: 'LOGIN', role: 'lecturer', lecturer, batch });
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') doLogin(); };

  return (
    <div className="login-stage">
      <div className="login-card view">
        <div className="eyebrow">Outcome-Based Education</div>
        <h1>PO Attainment Tracker</h1>

        {/* Sélecteur de rôle */}
        <div className="seg">
          <button className={loginRole === 'student'  ? 'on' : ''} onClick={() => setRole('student')}>Student</button>
          <button className={loginRole === 'lecturer' ? 'on' : ''} onClick={() => setRole('lecturer')}>Lecturer</button>
          <button className={loginRole === 'admin'    ? 'on' : ''} onClick={() => setRole('admin')}>Admin</button>
        </div>

        {/* Champ matricule pour étudiant, sinon login + mot de passe */}
        {loginRole === 'student' ? (
          <div className="field">
            <label>Student ID (matric)</label>
            <input ref={idRef} placeholder="Enter your matric number" autoComplete="off" onKeyDown={handleKey} />
          </div>
        ) : (
          <>
            <div className="field">
              <label>Username</label>
              <input ref={idRef} placeholder="Enter your username" autoComplete="off" onKeyDown={handleKey} />
            </div>
            <div className="field">
              <label>Password</label>
              <input ref={pwRef} type="password" placeholder="Enter your password" onKeyDown={handleKey} />
            </div>
          </>
        )}

        <button
          className="btn primary"
          style={{ width: '100%', justifyContent: 'center', height: 42 }}
          onClick={doLogin}
        >
          {loginRole === 'student' ? 'View my results' : loginRole === 'admin' ? 'Open admin console' : 'Open lecturer space'}
        </button>
      </div>
    </div>
  );
}
