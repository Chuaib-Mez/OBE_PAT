/* ============================================================
   student.js — Vue et interactions du tableau de bord étudiant
   Dépend de : data.js, charts.js, state.js (appbar)
   ============================================================ */


/*
  Génère le HTML complet du tableau de bord étudiant.
  Contient :
    - Un radar comparant ses scores PO avec la moyenne du batch
    - Des toggles pour afficher/masquer chaque série sur le radar
    - Un résumé (moyenne globale + nombre de POs atteints)
    - Un tableau détaillé PO par PO avec statut
*/
function viewStudent() {
  const stu  = STUDENTS[state.student.id];
  const prog = BATCHES[stu.batch].progress;
  const order = semOrder(prog);

  /* Si le semestre mémorisé n'existe plus (ex: changement d'étudiant), on repart du début */
  if (!order.includes(state.student.sem)) state.student.sem = order[0];
  const sem = state.student.sem;

  /* Calcul des scores PO : ceux de l'étudiant et la moyenne du batch */
  const mine = studentPO(stu, sem);
  const avg  = batchPO(stu.batch, sem);

  /* Construction des séries du radar selon les toggles activés */
  const series = [];
  if (state.student.showMine) series.push({values:mine, color:"var(--teal)",  stroke:"var(--teal)",  fill:0.16});
  if (state.student.showAvg)  series.push({values:avg,  color:"var(--amber)", stroke:"var(--amber)", fill:0.10});

  /* Moyenne globale de l'étudiant sur les 11 POs */
  const overall = avgOf(mine);

  /* Génération des lignes du tableau PO breakdown */
  const rows = POS.map((po, i) => {
    const v  = mine[i];
    const ok = v >= PASS;
    return `<tr>
      <td class="mono">${po}</td>
      <td style="color:var(--ink-3)">${PO_LABELS[i]}</td>
      <td class="num">${v.toFixed(2)}</td>
      <td class="num" style="color:var(--ink-3)">${avg[i].toFixed(0)}</td>
      <td>${ok ? '<span class="tag ok">met</span>' : '<span class="tag no">below threshold</span>'}</td>
    </tr>`;
  }).join("");

  return `<div class="view">${appbar()}<div class="wrap">

    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        ${state.role === 'admin'
          /* En mode admin : sélecteur déroulant pour choisir n'importe quel étudiant */
          ? `<select onchange="state.student.id=this.value;state.student.sem=1;render()"
               style="margin-top:6px;height:32px;border:1px solid var(--line-2);border-radius:8px;padding:0 8px;background:var(--surface);font-size:13px">
               ${Object.values(STUDENTS).map(s =>
                 `<option value="${s.id}" ${s.id === state.student.id ? 'selected' : ''}>
                    ${s.name} · ${s.matric} · ${BATCHES[s.batch].name}
                  </option>`
               ).join("")}
             </select>`
          /* En mode étudiant : affichage statique de ses infos */
          : `<div class="meta mono">${stu.name} · ${stu.matric} · ${BATCHES[stu.batch].name}</div>`}
      </div>

      <!-- Sélecteur de semestre (navigation ‹ ... ›) -->
      <div class="stepper" role="group" aria-label="Semester">
        <button onclick="stuSem(-1)" aria-label="Previous semester">‹</button>
        <span class="val mono">${sem === 'all' ? 'All semesters' : 'Up to semester ' + sem}</span>
        <button onclick="stuSem(1)" aria-label="Next semester">›</button>
      </div>
    </div>

    <div class="grid-2">

      <!-- Graphique radar -->
      <div class="card">
        <h2>Radar — PO attainment</h2>
        <div class="sub">Each PO = average of contributing course scores</div>
        ${radarSVG(series.length ? series : [{values:POS.map(() => 0), color:"transparent", stroke:"transparent"}])}
        <div class="legend">
          <span><span class="swatch" style="background:var(--teal)"></span>My scores</span>
          <span><span class="swatch" style="background:var(--amber)"></span>Batch average</span>
          <span><span class="dash-key"></span>Passing line</span>
        </div>
      </div>

      <div>
        <!-- Toggles : choisir ce qu'on affiche sur le radar -->
        <div class="card" style="margin-bottom:16px">
          <h2>Display</h2>
          <div class="sub">What to show on the radar</div>
          <div class="toggles">
            <label class="tog">
              <input type="checkbox" ${state.student.showMine ? 'checked' : ''} onchange="stuTog('showMine')">
              <span class="swatch" style="background:var(--teal)"></span>My scores
            </label>
            <label class="tog">
              <input type="checkbox" ${state.student.showAvg ? 'checked' : ''} onchange="stuTog('showAvg')">
              <span class="swatch" style="background:var(--amber)"></span>Batch average
            </label>
          </div>
        </div>

        <!-- Résumé chiffré -->
        <div class="card">
          <h2>Summary</h2>
          <div class="sub">Current selection</div>
          <div style="display:flex;gap:22px;align-items:baseline">
            <div>
              <div class="mono" style="font-size:30px;font-weight:600;color:var(--teal-2)">${overall}%</div>
              <div class="meta">average attainment</div>
            </div>
            <div>
              <div class="mono" style="font-size:30px;font-weight:600">${mine.filter(v => v >= PASS).length}/11</div>
              <div class="meta">POs met</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tableau détaillé : score perso, moyenne batch, statut par PO -->
    <div class="card" style="margin-top:18px">
      <h2>PO breakdown</h2>
      <div class="sub">My scores vs batch average</div>
      <table>
        <thead>
          <tr>
            <th>PO</th>
            <th>Outcome</th>
            <th style="text-align:right">My score</th>
            <th style="text-align:right">Batch avg</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

  </div></div>`;
}


/* Navigue vers le semestre précédent (-1) ou suivant (+1), de façon cyclique */
function stuSem(d) {
  const stu   = STUDENTS[state.student.id];
  const order = semOrder(BATCHES[stu.batch].progress);
  let i = order.indexOf(state.student.sem);
  i = (i + d + order.length) % order.length;
  state.student.sem = order[i];
  render();
}

/* Bascule un toggle de la vue étudiant : 'showMine' ou 'showAvg' */
function stuTog(k) {
  state.student[k] = !state.student[k];
  render();
}
