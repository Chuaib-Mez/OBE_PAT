/* ============================================================
   main.jsx — Point d'entrée de l'application React
   Équivalent du dernier appel render() dans state.js (version vanilla).

   Monte l'arbre React dans le div #root de index.html.
   StrictMode active des vérifications supplémentaires en développement
   (double-invocation des rendus, détection d'effets de bord, etc.).
   AppProvider enveloppe toute l'app pour exposer le contexte global.
   ============================================================ */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext.jsx';
import App from './App.jsx';
import './index.css'; /* Feuille de style globale (identique à style.css en version vanilla) */

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* AppProvider : fournit state, dispatch, toast et go à tout l'arbre */}
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);
