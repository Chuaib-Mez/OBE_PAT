/* ============================================================
   App.jsx — Composant racine et routeur principal
   Remplace le switch/render() de state.js (version vanilla).

   Lit state.view depuis le contexte global et affiche
   le composant de vue correspondant.
   Le composant Toast est toujours présent dans le DOM.
   ============================================================ */

import { useApp } from './context/AppContext.jsx';
import Toast from './components/Toast.jsx';
import Login from './views/Login.jsx';
import ChangePassword from './views/ChangePassword.jsx';
import StudentView from './views/StudentView.jsx';
import LecturerBatchesView from './views/LecturerBatchesView.jsx';
import LecturerStudentView from './views/LecturerStudentView.jsx';
import AdminView from './views/AdminView.jsx';

/* Routeur : affiche la vue correspondant à state.view */
function Router() {
  const { state } = useApp();
  switch (state.view) {
    case 'login':           return <Login />;
    case 'change-password': return <ChangePassword />;
    case 'student':         return <StudentView />;
    case 'lect-batches':    return <LecturerBatchesView />;
    case 'lect-student':    return <LecturerStudentView />;
    case 'admin':           return <AdminView />;
    default:                return <Login />;
  }
}

export default function App() {
  return (
    <>
      <Router />
      {/* Toast toujours monté — visible uniquement quand toastMsg est non vide */}
      <Toast />
    </>
  );
}
