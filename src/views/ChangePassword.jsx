/* ============================================================
   views/ChangePassword.jsx — Changement de mot de passe au premier login
   Affiché automatiquement quand mustChangePassword === true après LOGIN.
   Dispatch CHANGE_PASSWORD, puis redirige vers la vue principale.
   ============================================================ */

import { useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function ChangePassword() {
  const { state, dispatch, toast } = useApp();
  const newPwRef  = useRef(null);
  const confPwRef = useRef(null);

  /* Récupère les infos de l'utilisateur connecté pour l'affichage */
  const user =
    state.role === 'student'  ? state.students[state.student.id]       :
    state.role === 'lecturer' ? state.lecturers[state.lect.lecturer]   : null;

  const loginId =
    state.role === 'student'  ? user?.matric :
    state.role === 'lecturer' ? user?.email  : '';

  const doChange = () => {
    const np = newPwRef.current?.value  || '';
    const cf = confPwRef.current?.value || '';
    if (np.length < 6) { toast('Minimum 6 caractères'); return; }
    if (np !== cf)     { toast('Les mots de passe ne correspondent pas'); return; }
    dispatch({ type: 'CHANGE_PASSWORD', newPassword: np });
    toast('Mot de passe mis à jour');
  };

  const handleKey = (e) => { if (e.key === 'Enter') doChange(); };

  return (
    <div className="login-stage">
      <div className="login-card view">
        <div className="eyebrow">Premier login</div>
        <h1>Définissez votre mot de passe</h1>

        <p className="sub" style={{ marginBottom: 4 }}>
          Bienvenue {user?.firstName || user?.name || ''}.
          Veuillez choisir un nouveau mot de passe pour continuer.
        </p>
        <p className="meta" style={{ marginBottom: 20 }}>
          Identifiant : <span className="mono" style={{ color: 'var(--ink)' }}>{loginId}</span>
        </p>

        <div className="field">
          <label>Nouveau mot de passe</label>
          <input ref={newPwRef} type="password" placeholder="Minimum 6 caractères" autoComplete="new-password" onKeyDown={handleKey} />
        </div>
        <div className="field">
          <label>Confirmer le mot de passe</label>
          <input ref={confPwRef} type="password" placeholder="Répétez le mot de passe" autoComplete="new-password" onKeyDown={handleKey} />
        </div>

        <button
          className="btn primary"
          style={{ width: '100%', justifyContent: 'center', height: 42 }}
          onClick={doChange}
        >
          Valider et continuer
        </button>
      </div>
    </div>
  );
}
