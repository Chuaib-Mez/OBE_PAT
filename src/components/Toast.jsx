import { useApp } from '../context/AppContext.jsx';

export default function Toast() {
  const { toastMsg } = useApp();
  return <div id="toast" className={toastMsg ? 'show' : ''}>{toastMsg}</div>;
}
