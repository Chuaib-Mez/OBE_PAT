/* ============================================================
   views/Login.jsx — Page de connexion
   Trois rôles : Student (matricule + mdp), Lecturer (email + mdp),
   Admin (login + mot de passe vérifiés contre ADMIN_CREDENTIALS).
   Premier login → redirection vers ChangePassword (via reducer LOGIN).
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
    const idVal = (idRef.current?.value || '').trim();
    const pwVal = (pwRef.current?.value || '').trim();

    if (loginRole === 'student') {
      /* Recherche par matricule, insensible à la casse */
      const stu = Object.values(students).find(s => s.matric.toUpperCase() === idVal.toUpperCase());
      if (!stu) { toast('Matricule introuvable'); return; }
      if (stu.password !== pwVal) { toast('Mot de passe incorrect'); return; }
      dispatch({ type: 'LOGIN', role: 'student', studentId: stu.id });

    } else if (loginRole === 'admin') {
      /* Vérification des identifiants admin */
      if (idVal !== ADMIN_CREDENTIALS.login || pwVal !== ADMIN_CREDENTIALS.password) {
        toast('Identifiants invalides');
        return;
      }
      dispatch({ type: 'LOGIN', role: 'admin' });

    } else {
      /* Enseignant : recherche par email (= nom d'utilisateur) */
      const entry = Object.entries(lecturers).find(([, l]) => l.email?.toLowerCase() === idVal.toLowerCase());
      if (!entry) { toast('Aucun compte trouvé pour cet email'); return; }
      const [lid, lec] = entry;
      if (lec.password !== pwVal) { toast('Mot de passe incorrect'); return; }
      const batch = lecturerBatches(lid, batches)[0] || Object.keys(batches)[0];
      dispatch({ type: 'LOGIN', role: 'lecturer', lecturer: lid, batch });
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') doLogin(); };

  /* Label du champ identifiant selon le rôle */
  const idLabel = loginRole === 'student' ? 'Matricule' : loginRole === 'admin' ? 'Nom d\'utilisateur' : 'Adresse email';
  const idPlaceholder = loginRole === 'student' ? 'Entrez votre matricule' : loginRole === 'admin' ? 'admin' : 'prenom.nom@univ.edu';

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

        {/* Identifiant */}
        <div className="field">
          <label>{idLabel}</label>
          <input ref={idRef} placeholder={idPlaceholder} autoComplete="off" onKeyDown={handleKey} />
        </div>

        {/* Mot de passe */}
        <div className="field">
          <label>Mot de passe</label>
          <input ref={pwRef} type="password" placeholder="Entrez votre mot de passe" onKeyDown={handleKey} />
        </div>

        <button
          className="btn primary"
          style={{ width: '100%', justifyContent: 'center', height: 42 }}
          onClick={doLogin}
        >
          {loginRole === 'student' ? 'Voir mes résultats' : loginRole === 'admin' ? 'Console admin' : 'Espace enseignant'}
        </button>
      </div>
    </div>
  );
}
