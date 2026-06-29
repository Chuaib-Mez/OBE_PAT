/* ============================================================
   components/Toast.jsx — Notification temporaire (toast)
   Remplace le div #toast et la fonction toast() de state.js (version vanilla).

   Lit toastMsg depuis le contexte global.
   La classe CSS "show" est gérée par AppContext (ajoutée pendant 2,2 s).
   Aucune logique de timer ici : tout est dans AppProvider.
   ============================================================ */

import { useApp } from '../context/AppContext.jsx';

export default function Toast() {
  const { toastMsg } = useApp();

  /* Le div est toujours dans le DOM ; la classe "show" le rend visible */
  return <div id="toast" className={toastMsg ? 'show' : ''}>{toastMsg}</div>;
}
