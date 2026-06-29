import { POS, PO_LABELS } from '../data/index.js';

export default function PoChips({ w }) {
  return (
    <div className="po-chips">
      {POS.map((p, pi) =>
        w[pi] > 0 ? (
          <span key={p} className="pochip on" title={`${PO_LABELS[pi]} (coef ${w[pi]})`}>
            {p}{w[pi] !== 1 ? ` ·${w[pi]}` : ''}
          </span>
        ) : null
      )}
    </div>
  );
}
