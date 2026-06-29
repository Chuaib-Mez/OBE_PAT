import { useApp } from './context/AppContext.jsx';
import Toast from './components/Toast.jsx';
import Login from './views/Login.jsx';
import StudentView from './views/StudentView.jsx';
import LecturerBatchesView from './views/LecturerBatchesView.jsx';
import LecturerStudentView from './views/LecturerStudentView.jsx';
import AdminView from './views/AdminView.jsx';

function Router() {
  const { state } = useApp();
  switch (state.view) {
    case 'login':        return <Login />;
    case 'student':      return <StudentView />;
    case 'lect-batches': return <LecturerBatchesView />;
    case 'lect-student': return <LecturerStudentView />;
    case 'admin':        return <AdminView />;
    default:             return <Login />;
  }
}

export default function App() {
  return (
    <>
      <Router />
      <Toast />
    </>
  );
}
