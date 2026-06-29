/* ============================================================
   components/PoChips.jsx — Chips PO pour un cours donné
   Remplace la fonction poChipsW() de charts.js (version vanilla).

   Affiche uniquement les POs auxquels le cours contribue (coefficient > 0).
   Un coefficient > 1 est affiché après le nom du PO (ex : "PO1 ·2").

   Props :
     w — tableau de 11 coefficients (issu de la matrice CO-PO)
   ============================================================ */

import { POS, PO_LABELS } from '../data/index.js';

export default function PoChips({ w }) {
  return (
    <div className="po-chips">
      {POS.map((p, pi) =>
        /* N'affiche que les POs avec un coefficient non nul */
        w[pi] > 0 ? (
          <span
            key={p}
            className="pochip on"
            title={`${PO_LABELS[pi]} (coef ${w[pi]})`} /* Infobulle avec description complète */
          >
            {p}{w[pi] !== 1 ? ` ·${w[pi]}` : ''}
          </span>
        ) : null
      )}
    </div>
  );
}
