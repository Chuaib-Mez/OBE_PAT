/* ============================================================
   lecturer.js — Vues enseignant + import/export CSV
   Dépend de : data.js, charts.js, state.js (appbar)
   ============================================================ */


/* ============================================================
   VUE PRINCIPALE : LISTE DES BATCHES
   Sidebar de sélection + graphiques + tableaux de cours et d'étudiants.
   ============================================================ */

function viewLectBatches() {
  const vis = visibleBatches();

  /* Si le batch mémorisé n'est plus accessible, prend le premier disponible */
  if (!vis.includes(state.lect.batch)) state.lect.batch = vis[0] || Object.keys(BATCHES)[0];

  const b     = BATCHES[state.lect.batch];
  const order = semOrder(b.progress);
  if (!order.includes(state.lect.sem)) state.lect.sem = order[0];
  const sem = state.lect.sem;

  /* Scores PO du batch pour le semestre sélectionné */
  const cur    = batchPO(state.lect.batch, sem);
  const series = [{values:cur, color:"var(--teal)", stroke:"var(--teal)"}];

  /* Ajoute une série grisée si la comparaison par année est activée */
  if (state.lect.compare) {
    series.push({values:b.history[state.lect.compareYear], color:"var(--ink-3)", stroke:"var(--ink-3)", muted:true});
  }

  const overall = avgOf(cur);

  /* Boutons de sélection de batch dans la sidebar */
  const sidebar = vis.map(id => {
    const bt = BATCHES[id];
    /* En mode admin "tous les enseignants" : affiche le nom de l'enseignant responsable */
    const small = (state.role === 'admin' && state.lect.filter === 'all')
      ? (LECTURERS[bt.owner] ? LECTURERS[bt.owner].name : bt.session)
      : bt.session;
    return `<button class="bitem ${id === state.lect.batch ? 'on' : ''}" onclick="lectPick('${id}')">
      <span>${bt.name}</span><small>${small}</small>
    </button>`;
  }).join("") || `<div class="empty">No batch.</div>`;

  /* Filtre par enseignant (visible uniquement en mode admin) */
  const lectFilter = state.role === 'admin' ? `
    <div class="label">Lecturer</div>
    <select onchange="state.lect.filter=this.value;render()"
      style="width:100%;height:34px;border:1px solid var(--line-2);border-radius:8px;padding:0 8px;background:var(--surface);margin-bottom:10px;font-size:13px">
      <option value="all" ${state.lect.filter === 'all' ? 'selected' : ''}>All lecturers</option>
      ${Object.entries(LECTURERS).map(([id, l]) =>
        `<option value="${id}" ${state.lect.filter === id ? 'selected' : ''}>${l.name}</option>`
      ).join("")}
    </select>` : '';

  /* Tableau des cours du batch avec leur taux d'atteinte */
  const courses = batchCourses(state.lect.batch, sem);
  const courseRows = courses.map(c => {
    const att = courseAttainment(state.lect.batch, c.code);
    const ok  = att >= PASS;
    return `<tr>
      <td class="mono">S${c.semester}</td>
      <td class="mono">${c.code}</td>
      <td>${c.name}</td>
      <td>${poChipsW(c.w)}</td>
      <td class="num">${att == null ? '—' : att + '%'}</td>
      <td>${att == null ? '' : (ok ? '<span class="tag ok">met</span>' : '<span class="tag no">below</span>')}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" class="empty">No course data for this batch yet.</td></tr>`;

  /* Tableau des étudiants du batch (cliquables pour voir le détail) */
  const studentRows = b.students.map(id => {
    const s  = STUDENTS[id];
    const po = studentPO(s, sem);
    const ov = avgOf(po);
    return `<tr onclick="lectStudent('${id}')" style="cursor:pointer">
      <td class="mono">${s.matric}</td>
      <td>${s.name}</td>
      <td class="num">${ov}%</td>
      <td class="num">${po.filter(v => v >= PASS).length}/11</td>
      <td style="color:var(--ink-3)">›</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5" class="empty">No student — import an Excel file.</td></tr>`;

  return `<div class="view">${appbar()}<div class="wrap">

    <div class="page-head">
      <div>
        <h1>Lecturer space</h1>
        <div class="meta">PO attainment computed from course attainment · comparison · comment</div>
      </div>
    </div>

    <div class="ld">

      <!-- Sidebar : import/export + filtre enseignant + liste des batches -->
      <aside class="side">
        <div class="io">
          <button class="btn primary sm" onclick="doImport()">⬆ Import Excel</button>
          <button class="btn sm" onclick="doExport()">⬇ Export Excel</button>
          <!-- Input fichier caché, déclenché par le bouton Import -->
          <input id="fileimp" type="file" accept=".csv" hidden onchange="onImport(event)">
        </div>
        ${lectFilter}
        <div class="label">Batches</div>
        <div class="blist">${sidebar}</div>
      </aside>

      <main>
        <!-- En-tête du batch sélectionné avec navigation semestre + comparaison -->
        <div class="page-head" style="margin-bottom:14px">
          <div>
            <h1 style="font-size:18px">${b.name} · ${b.year}</h1>
            <div class="meta mono">
              ${b.session} · ${LECTURERS[b.owner] ? LECTURERS[b.owner].name : '—'} · average attainment ${overall}%
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <!-- Toggle "comparer par année" -->
            <label class="tog" style="font-size:13px">
              <input type="checkbox" ${state.lect.compare ? 'checked' : ''} onchange="lectCompare()">
              Compare by year
            </label>
            <!-- Sélecteur d'année de comparaison (visible si le toggle est activé) -->
            ${state.lect.compare ? `
              <div class="stepper" role="group" aria-label="Comparison year">
                <button onclick="lectCmpYear(-1)"
                  ${state.lect.compareYear <= COMPARE_YEARS[COMPARE_YEARS.length - 1] ? 'disabled' : ''}
                  aria-label="Older year">‹</button>
                <span class="val mono">${b.name} · ${state.lect.compareYear}</span>
                <button onclick="lectCmpYear(1)"
                  ${state.lect.compareYear >= COMPARE_YEARS[0] ? 'disabled' : ''}
                  aria-label="Newer year">›</button>
              </div>` : ''}
            <!-- Navigation entre semestres -->
            <div class="stepper">
              <button onclick="lectSem(-1)">‹</button>
              <span class="val mono">${sem === 'all' ? 'Cumulative' : 'Up to sem ' + sem}</span>
              <button onclick="lectSem(1)">›</button>
            </div>
          </div>
        </div>

        <!-- Graphique en barres : atteinte PO du batch -->
        <div class="card">
          <h2>Cumulative PO attainment (%)</h2>
          <div class="sub">One bar per PO · red line = passing threshold</div>
          ${barsSVG(series)}
          <div class="legend">
            <span><span class="swatch" style="background:var(--teal)"></span>${b.name} · ${b.year}</span>
            ${state.lect.compare
              ? `<span><span class="swatch" style="background:var(--line-2)"></span>${b.name} · ${state.lect.compareYear}</span>`
              : ''}
            <span><span class="swatch" style="background:var(--red)"></span>PO below threshold</span>
          </div>
        </div>

        <!-- Tableau des cours et leur contribution aux POs -->
        <div class="card" style="margin-top:16px">
          <h2>Course attainment</h2>
          <div class="sub">PO attainment above = average of the courses contributing to each PO</div>
          <table>
            <thead><tr><th>Sem</th><th>Code</th><th>Course</th><th>Contributes to</th><th style="text-align:right">Attainment</th><th>Status</th></tr></thead>
            <tbody>${courseRows}</tbody>
          </table>
          <div class="meta" style="margin-top:8px">
            Course attainment = average of the students' scores for that course. Edit individual students below.
          </div>
        </div>

        <!-- Zone de commentaire libre au niveau du batch -->
        <div class="card comment" style="margin-top:16px">
          <h2>Batch comment</h2>
          <div class="sub">One note at batch level (not per student)</div>
          <textarea id="bcomment" placeholder="Observations, areas to improve, teaching decisions…">${b.comment}</textarea>
          <div class="row-end">
            <button class="btn primary sm" onclick="saveComment()">Save comment</button>
          </div>
        </div>

        <!-- Liste des étudiants du batch -->
        <div class="card" style="margin-top:16px">
          <h2>Batch students (${b.students.length})</h2>
          <div class="sub">Click a row to view and edit course scores</div>
          <table>
            <thead><tr><th>Matric</th><th>Name</th><th style="text-align:right">Average</th><th style="text-align:right">POs met</th><th></th></tr></thead>
            <tbody>${studentRows}</tbody>
          </table>
        </div>

        <!-- Vue globale : moyenne PO sur tous les batches confondus -->
        <div class="card" style="margin-top:16px">
          <h2>Overall PO attainment — all batches</h2>
          <div class="sub">Global average per PO across all batches</div>
          ${barsSVG([{
            values: POS.map((_, p) => avgOf(Object.keys(BATCHES).map(id => batchPO(id, 'all')[p]).filter(v => v > 0))),
            color: "var(--teal)",
            stroke: "var(--teal)",
          }])}
        </div>
      </main>
    </div>

  </div></div>`;
}

/* Sélectionne un batch dans la sidebar et réinitialise les options de vue */
function lectPick(id) {
  state.lect.batch = id;
  state.lect.compare = false;
  state.lect.compareYear = 2025;
  state.lect.sem = 1;
  render();
}

/* Navigue vers le semestre précédent (-1) ou suivant (+1), cyclique */
function lectSem(d) {
  const order = semOrder(BATCHES[state.lect.batch].progress);
  let i = order.indexOf(state.lect.sem);
  i = (i + d + order.length) % order.length;
  state.lect.sem = order[i];
  render();
}

/* Active ou désactive la comparaison par année */
function lectCompare() { state.lect.compare = !state.lect.compare; render(); }

/* Navigue entre les années de comparaison disponibles (borné) */
function lectCmpYear(d) {
  let y = state.lect.compareYear + d;
  y = Math.max(COMPARE_YEARS[COMPARE_YEARS.length - 1], Math.min(COMPARE_YEARS[0], y));
  state.lect.compareYear = y;
  render();
}

/* Sauvegarde le commentaire batch saisi dans le textarea */
function saveComment() {
  BATCHES[state.lect.batch].comment = document.getElementById("bcomment").value;
  toast("Comment saved");
}


/* ============================================================
   VUE DÉTAIL ÉTUDIANT — scores de cours éditables
   ============================================================ */

/* Navigue vers la vue détail d'un étudiant spécifique */
function lectStudent(id) { state.lect.studentId = id; go("lect-student"); }

/* Génère le HTML de la vue détail : tableau de saisie + radar */
function viewLectStudent() {
  const s       = STUDENTS[state.lect.studentId];
  const all     = studentPO(s, 'all');    /* Scores PO cumulés tous semestres */
  const courses = studentCourses(s);      /* Cours de l'étudiant triés par semestre */

  /* Lignes du tableau de saisie (une ligne = un cours) */
  const body = courses.map(c => {
    const v = s.courseScores[c.code];
    return `<tr>
      <td class="semcol mono">S${c.semester}</td>
      <td class="mono">${c.code}</td>
      <td>${c.name}</td>
      <td>${poChipsW(c.w)}</td>
      <!-- Input numérique 0-100 ; rouge si score sous le seuil -->
      <td style="text-align:center">
        <input class="cell-in ${v < PASS ? 'under' : ''}" type="number"
          min="0" max="100" value="${v}" data-code="${c.code}" oninput="cellEdit(this)">
      </td>
    </tr>`;
  }).join("");

  /* Position de l'étudiant dans son batch (pour les boutons ‹ Précédent / Suivant ›) */
  const idx = BATCHES[s.batch].students.indexOf(s.id);

  return `<div class="view">${appbar()}<div class="wrap">

    <div class="page-head">
      <div>
        <!-- Bouton retour vers la liste du batch -->
        <button class="btn ghost sm" onclick="go('lect-batches')">‹ ${BATCHES[s.batch].name}</button>
        <h1 style="margin-top:8px">${s.name}</h1>
        <div class="meta mono">${s.matric} · average ${avgOf(all)}%</div>
      </div>
      <!-- Navigation entre étudiants du même batch -->
      <div class="stepper">
        <button onclick="navStu(-1)" ${idx <= 0 ? 'disabled' : ''}>‹ Previous</button>
        <span class="val">${idx + 1} / ${BATCHES[s.batch].students.length}</span>
        <button onclick="navStu(1)" ${idx >= BATCHES[s.batch].students.length - 1 ? 'disabled' : ''}>Next ›</button>
      </div>
    </div>

    <div class="grid-2">
      <!-- Tableau de saisie des scores par cours -->
      <div class="card">
        <h2>Course attainment (editable)</h2>
        <div class="sub">Enter the student's attainment per course · POs are computed from it</div>
        <div class="gridtbl">
          <table>
            <thead><tr><th class="semcol">Sem</th><th>Code</th><th>Course</th><th>Contributes to</th><th>%</th></tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <div class="row-end">
          <button class="btn sm" onclick="go('lect-student')">Cancel</button>
          <button class="btn primary sm" onclick="saveScores()">Save</button>
        </div>
      </div>

      <!-- Radar recalculé à la sauvegarde -->
      <div class="card">
        <h2>Radar — student average</h2>
        <div class="sub">Recomputed on save</div>
        <div id="stu-radar">
          ${radarSVG([{values:all, color:"var(--teal)", stroke:"var(--teal)"}], {w:320, h:300})}
        </div>
        <div class="legend">
          <span><span class="swatch" style="background:var(--teal)"></span>Average across courses</span>
          <span><span class="dash-key"></span>Threshold 50%</span>
        </div>
      </div>
    </div>

  </div></div>`;
}

/* Met à jour la couleur d'un input en temps réel : rouge si sous le seuil */
function cellEdit(el) {
  const v = Math.max(0, Math.min(100, parseInt(el.value || 0, 10)));
  el.classList.toggle('under', v < PASS);
}

/* Sauvegarde tous les scores modifiés et rafraîchit le radar sans recharger la vue */
function saveScores() {
  const s = STUDENTS[state.lect.studentId];
  /* Parcourt tous les inputs et met à jour les scores dans l'objet STUDENTS */
  document.querySelectorAll('.cell-in[data-code]').forEach(el => {
    s.courseScores[el.dataset.code] = Math.max(0, Math.min(100, parseInt(el.value || 0, 10)));
  });
  /* Remplace uniquement le SVG radar, sans recharger toute la page */
  document.getElementById("stu-radar").innerHTML =
    radarSVG([{values:studentPO(s, 'all'), color:"var(--teal)", stroke:"var(--teal)"}], {w:320, h:300});
  toast("Scores saved");
}

/* Navigue vers l'étudiant précédent (-1) ou suivant (+1) dans le batch */
function navStu(d) {
  const ids = BATCHES[STUDENTS[state.lect.studentId].batch].students;
  const i   = ids.indexOf(state.lect.studentId) + d;
  if (i < 0 || i >= ids.length) return;
  state.lect.studentId = ids[i];
  render();
}


/* ============================================================
   IMPORT / EXPORT CSV
   ============================================================ */

/* Exporte les scores du batch actuel au format CSV et déclenche le téléchargement */
function doExport() {
  const b = BATCHES[state.lect.batch];
  let rows = [["Matric", "Name", "Course", "Attainment"]];
  b.students.forEach(id => {
    const s = STUDENTS[id];
    Object.keys(s.courseScores).forEach(code => {
      rows.push([s.matric, s.name, code, s.courseScores[code]]);
    });
  });
  /* Encode correctement les valeurs contenant des virgules ou guillemets */
  const csv = rows.map(r =>
    r.map(c => /[",\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(",")
  ).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = b.name.replace(/\s/g, "_") + "_course_attainment.csv";
  a.click();
  toast("Export generated (" + b.name + ")");
}

/* Ouvre le sélecteur de fichier natif du navigateur */
function doImport() { document.getElementById("fileimp").click(); }

/* Intercepte la sélection d'un fichier et lance l'import pour le batch actuel */
function onImport(e) {
  const f = e.target.files[0];
  if (f) importFile(f, state.lect.batch);
  e.target.value = ""; /* Réinitialise l'input pour permettre de re-sélectionner le même fichier */
}

/*
  Lit et parse un fichier CSV importé.
  Colonnes attendues : Matric, Name (optionnel), Course, Attainment.
  Si le matricule n'existe pas encore, crée un nouvel étudiant.
*/
function importFile(f, targetBatch) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const lines = r.result.split(/\r?\n/).filter(l => l.trim());
      const head  = lines.shift().split(",").map(h => h.trim().toLowerCase());
      /* Détecte les colonnes par leur en-tête */
      const iM = head.indexOf("matric"), iN = head.indexOf("name"),
            iC = head.indexOf("course"), iA = head.indexOf("attainment");
      if (iM < 0 || iC < 0 || iA < 0) {
        toast("Expected format: Matric,Name,Course,Attainment");
        return;
      }
      const b = BATCHES[targetBatch];
      let count = 0;
      const rows = [];
      lines.forEach(l => {
        const c      = l.split(",");
        const matric = (c[iM] || "").trim();
        const course = (c[iC] || "").trim().toUpperCase();
        if (!matric || !course) return;
        /* Cherche un étudiant existant ; sinon en crée un nouveau */
        let stu = Object.values(STUDENTS).find(s => s.matric.toUpperCase() === matric.toUpperCase());
        if (!stu) {
          const id = "imp" + Object.keys(STUDENTS).length;
          stu = {id, batch:targetBatch, matric, name:(iN >= 0 ? (c[iN] || matric) : matric).trim(), courseScores:{}};
          STUDENTS[id] = stu;
          b.students.push(id);
        }
        const att = Math.max(0, Math.min(100, parseInt(c[iA], 10) || 0));
        stu.courseScores[course] = att;
        rows.push({matric, name:stu.name, course, att});
        count++;
      });
      regImport(f.name, targetBatch, rows);
      toast(count + " rows imported into " + b.name);
      render();
    } catch (err) {
      toast("Could not read file");
    }
  };
  r.readAsText(f);
}
