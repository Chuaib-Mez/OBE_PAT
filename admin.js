/* ============================================================
   admin.js — Console d'administration (Registrar)
   Permet de gérer le curriculum (CO-PO matrix), les batches,
   les enseignants responsables et les fichiers importés.
   Dépend de : data.js, charts.js, lecturer.js (importFile), state.js (appbar)
   ============================================================ */


/*
  Génère le HTML complet de la console admin.
  Contient trois sections :
    1. Assignation des batches aux enseignants
    2. Matrice CO-PO éditable (coefficients des cours par PO)
    3. Registre des fichiers importés (view / download / delete)
*/
function viewAdmin() {

  /* ---- En-têtes de colonnes de la matrice CO-PO ---- */
  /* Une colonne = un cours avec son code, son nom, son semestre (éditable) et un bouton suppression */
  const courseHeads = COURSES.map((c, ci) => {
    const editing = state.admin.editSemCi === ci; /* Ce cours est-il en mode édition de semestre ? */
    const semCtrl = editing
      /* Mode édition : input numérique + bouton "valider" */
      ? `<span class="ts" style="color:var(--ink-3)">Semester</span>
         <input class="cell-in" style="width:40px" type="number" min="1" max="8"
           value="${c.semester}" onchange="courseSetSem(${ci},this.value)">
         <button class="btn ghost sm" style="padding:2px 6px" onclick="endEditSem()" aria-label="Done">✓</button>`
      /* Mode affichage : texte + bouton "modifier" */
      : `<span class="ts" style="color:var(--ink-2)">Semester ${c.semester}</span>
         <button class="btn ghost sm" style="padding:2px 6px" onclick="startEditSem(${ci})" aria-label="Edit semester">✎</button>`;
    return `<th style="text-align:center;min-width:120px">
      <div class="mono" style="font-weight:600">${c.code}</div>
      <div class="ts" style="color:var(--ink-3);font-weight:400">${c.name}</div>
      <div style="display:flex;gap:5px;justify-content:center;align-items:center;margin-top:4px">${semCtrl}</div>
      <div style="margin-top:3px">
        <button class="btn ghost sm" style="padding:2px 7px" onclick="delCourse(${ci})" aria-label="Delete course">✕</button>
      </div>
    </th>`;
  }).join("");

  /* ---- Lignes de la matrice CO-PO ---- */
  /* Une ligne = un PO ; chaque cellule = un coefficient modifiable (input numérique) */
  const poRows = POS.map((p, pi) => `<tr>
    <td class="semcol" style="min-width:200px">
      <b class="mono">${p}</b>
      <span class="ts" style="color:var(--ink-3)">${PO_LABELS[pi]}</span>
    </td>
    ${COURSES.map((c, ci) =>
      `<td style="text-align:center">
         <input class="cell-in wcell ${c.w[pi] > 0 ? 'on' : ''}" type="number" min="0" step="1"
           value="${c.w[pi] || 0}" onchange="courseSetW(${ci},${pi},this.value)">
       </td>`
    ).join("")}
  </tr>`).join("");

  /* ---- Lignes du tableau des fichiers importés ---- */
  const fileRows = IMPORTS.map(f => `
    <tr class="${f.id === state.admin.fileId ? 'on' : ''}">
      <td class="mono">${f.filename}</td>
      <td>${BATCHES[f.batch] ? BATCHES[f.batch].name : f.batch}</td>
      <td class="mono">${f.importedAt}</td>
      <td class="num">${f.rows.length}</td>
      <td style="white-space:nowrap;text-align:right">
        <button class="btn ghost sm" onclick="viewFile('${f.id}')">View</button>
        <button class="btn ghost sm" onclick="dlFile('${f.id}')">Download</button>
        <button class="btn ghost sm" onclick="delFile('${f.id}')">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="5" class="empty">No file imported.</td></tr>`;

  /* ---- Prévisualisation du fichier sélectionné ---- */
  const sel = state.admin.fileId ? IMPORTS.find(f => f.id === state.admin.fileId) : null;
  let preview = "";
  if (sel) {
    /* Tableau de détail du fichier : une ligne = une entrée matric/cours/score */
    const body = sel.rows.map(r =>
      `<tr>
        <td class="semcol mono">${r.matric}</td>
        <td>${r.name}</td>
        <td class="mono">${r.course}</td>
        <td class="num" style="${r.att < PASS ? 'color:var(--red)' : ''}">${r.att}</td>
      </tr>`
    ).join("");
    preview = `<div class="card" style="margin-top:16px">
      <div class="page-head" style="margin-bottom:10px">
        <div>
          <h2 style="font-size:15px">Preview — ${sel.filename}</h2>
          <div class="sub">${BATCHES[sel.batch] ? BATCHES[sel.batch].name : sel.batch} · ${sel.rows.length} rows</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn sm" onclick="dlFile('${sel.id}')">⬇ Download</button>
          <button class="btn ghost sm" onclick="closeFile()">Close</button>
        </div>
      </div>
      <div class="gridtbl">
        <table>
          <thead><tr><th class="semcol">Matric</th><th>Name</th><th>Course</th><th>Attainment</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
  }

  /* Options du sélecteur de batch cible pour l'import */
  const batchOpts = Object.entries(BATCHES).map(([id, b]) =>
    `<option value="${id}" ${id === state.admin.targetBatch ? 'selected' : ''}>${b.name} · ${b.year}</option>`
  ).join("");

  return `<div class="view">${appbar()}<div class="wrap">

    <div class="page-head">
      <div>
        <h1>Administration console</h1>
        <div class="meta">Registrar · curriculum & imported files</div>
      </div>
    </div>

    <!-- Section 1 : assignation des batches aux enseignants -->
    <div class="card">
      <div class="page-head" style="margin-bottom:10px">
        <div>
          <h2 style="font-size:15px">Lecturers & batches</h2>
          <div class="sub">Assign each batch to its responsible lecturer</div>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Batch</th><th>Year</th><th>Session</th><th style="text-align:right">Students</th><th>Responsible lecturer</th></tr>
        </thead>
        <tbody>
          ${Object.entries(BATCHES).map(([id, b]) => `
            <tr>
              <td>${b.name}</td>
              <td class="mono">${b.year}</td>
              <td class="mono">${b.session}</td>
              <td class="num">${b.students.length}</td>
              <td>
                <!-- Sélecteur : change l'enseignant responsable du batch -->
                <select onchange="setOwner('${id}',this.value)"
                  style="height:32px;border:1px solid var(--line-2);border-radius:8px;padding:0 8px;background:var(--surface);font-size:13px">
                  ${Object.entries(LECTURERS).map(([lid, l]) =>
                    `<option value="${lid}" ${b.owner === lid ? 'selected' : ''}>${l.name}</option>`
                  ).join("")}
                </select>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <!-- Section 2 : matrice CO-PO éditable -->
    <div class="card" style="margin-top:16px">
      <div class="page-head" style="margin-bottom:10px">
        <div>
          <h2 style="font-size:15px">Courses & PO mapping</h2>
          <div class="sub">CO-PO matrix · enter a coefficient (0 = no contribution) · PO attainment = weighted average</div>
        </div>
      </div>
      <!-- Légende des POs -->
      <div class="po-legend">
        ${POS.map((p, i) => `<span title="${PO_LABELS[i]}"><b>${p}</b> ${PO_LABELS[i]}</span>`).join("")}
      </div>
      <!-- Tableau de la matrice -->
      <div class="gridtbl">
        <table class="matrix">
          <thead>
            <tr><th class="semcol" style="min-width:200px">PO / Course</th>${courseHeads}</tr>
          </thead>
          <tbody>${poRows}</tbody>
        </table>
      </div>
      <!-- Formulaire d'ajout d'un nouveau cours -->
      <div class="addrow">
        <input id="c-code" class="cell-in" style="width:96px;text-align:left" placeholder="Code (e.g. CS401)">
        <input id="c-name" class="cell-in" style="width:230px;text-align:left" placeholder="Course name">
        <input id="c-sem"  class="cell-in" style="width:60px" type="number" min="1" max="8" placeholder="Sem">
        <button class="btn primary sm" onclick="addCourse()">+ Add course</button>
        <span class="meta">then enter coefficients in the matrix</span>
      </div>
    </div>

    <!-- Section 3 : registre des fichiers importés -->
    <div class="card" style="margin-top:16px">
      <div class="page-head" style="margin-bottom:10px">
        <div>
          <h2 style="font-size:15px">Imported Excel files</h2>
          <div class="sub">Full registry · view, download, delete</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <!-- Sélection du batch cible avant l'import -->
          <select id="admtarget" onchange="state.admin.targetBatch=this.value"
            style="height:34px;border:1px solid var(--line-2);border-radius:8px;padding:0 8px;background:var(--surface)">
            ${batchOpts}
          </select>
          <button class="btn primary sm" onclick="adminImport()">⬆ Import</button>
          <!-- Input fichier caché pour l'import admin -->
          <input id="admfile" type="file" accept=".csv" hidden onchange="onAdminImport(event)">
        </div>
      </div>
      <table>
        <thead>
          <tr><th>File</th><th>Batch</th><th>Imported on</th><th style="text-align:right">Rows</th><th></th></tr>
        </thead>
        <tbody>${fileRows}</tbody>
      </table>
    </div>

    <!-- Prévisualisation du fichier sélectionné (si applicable) -->
    ${preview}

  </div></div>`;
}


/* ---- Actions sur les fichiers importés ---- */

/* Ouvre le sélecteur de fichier pour l'import admin */
function adminImport() { document.getElementById("admfile").click(); }

/* Intercepte la sélection du fichier et lance l'import vers le batch cible */
function onAdminImport(e) {
  const f = e.target.files[0];
  if (f) importFile(f, state.admin.targetBatch); /* importFile défini dans lecturer.js */
  e.target.value = "";
}

/* Affiche la prévisualisation d'un fichier importé */
function viewFile(id) { state.admin.fileId = id; render(); }

/* Ferme la prévisualisation */
function closeFile() { state.admin.fileId = null; render(); }

/* Télécharge un fichier du registre au format CSV */
function dlFile(id) {
  const f = IMPORTS.find(x => x.id === id);
  if (!f) return;
  let rows = [["Matric", "Name", "Course", "Attainment"]];
  f.rows.forEach(r => rows.push([r.matric, r.name, r.course, r.att]));
  const csv = rows.map(r =>
    r.map(c => /[",\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(",")
  ).join("\n");
  const b = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = f.filename.replace(/\.[^.]+$/, '') + ".csv";
  a.click();
  toast("Download: " + f.filename);
}

/* Supprime un fichier du registre */
function delFile(id) {
  const i = IMPORTS.findIndex(x => x.id === id);
  if (i >= 0) IMPORTS.splice(i, 1);
  if (state.admin.fileId === id) state.admin.fileId = null; /* Ferme la prévisualisation si elle était ouverte */
  toast("File deleted");
  render();
}


/* ---- Actions sur la matrice CO-PO ---- */

/* Change l'enseignant responsable d'un batch */
function setOwner(batchId, lid) { BATCHES[batchId].owner = lid; toast("Assignment updated"); render(); }

/* Met à jour le coefficient d'un cours pour un PO donné (valeur >= 0) */
function courseSetW(ci, pi, val) {
  const v = Math.max(0, parseInt(val || 0, 10) || 0);
  COURSES[ci].w[pi] = v;
  render();
}

/* Active le mode édition du semestre d'un cours */
function startEditSem(ci) { state.admin.editSemCi = ci; render(); }

/* Quitte le mode édition du semestre */
function endEditSem() { state.admin.editSemCi = -1; render(); }

/* Met à jour le semestre d'un cours (borné entre 1 et 8) */
function courseSetSem(ci, val) {
  COURSES[ci].semester = Math.max(1, Math.min(8, parseInt(val || 1, 10)));
  render();
}

/* Ajoute un nouveau cours avec des coefficients vides (à remplir dans la matrice) */
function addCourse() {
  const code = (document.getElementById("c-code").value || "").trim();
  const name = (document.getElementById("c-name").value || "").trim();
  const sem  = Math.max(1, Math.min(8, parseInt(document.getElementById("c-sem").value || 1, 10)));
  if (!code && !name) { toast("Enter a code and name"); return; }
  COURSES.push({code:code || "NEW", name:name || "Untitled course", semester:sem, w:Array(11).fill(0)});
  toast("Course added");
  render();
}

/* Supprime un cours de la liste */
function delCourse(i) {
  COURSES.splice(i, 1);
  state.admin.editSemCi = -1;
  toast("Course deleted");
  render();
}
