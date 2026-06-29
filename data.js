/* ============================================================
   data.js — Constantes, données métier et fonctions de calcul
   Chargé en premier : tout le reste en dépend.
   ============================================================ */


/* ---- Seuil de réussite ---- */
const PASS = 50; /* Un PO est "atteint" si le score >= 50% */

/* ---- Liste des 11 Programme Outcomes ---- */
const POS = Array.from({length:11}, (_, i) => 'PO' + (i + 1));

/* ---- Descriptions longues des POs ---- */
const PO_LABELS = [
  "Computing knowledge",
  "Problem analysis",
  "Software design & development",
  "Web development",
  "Computer architecture",
  "Database & data management",
  "Networking & security",
  "Professional ethics",
  "Communication",
  "Teamwork",
  "Lifelong learning",
];


/* ============================================================
   MATRICE CO-PO
   Chaque cours contribue à certains POs avec un coefficient.
   ============================================================ */

/*
  Construit un tableau de 11 coefficients depuis un dictionnaire.
  Exemple : W({0:2, 2:1}) → [2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]
  Index 0 = PO1, index 1 = PO2, etc.
*/
function W(map) {
  const a = Array(11).fill(0);
  for (const k in map) a[+k] = map[k];
  return a;
}

/* Liste de tous les cours du programme */
const COURSES = [
  {code:"CS101", name:"Programming Fundamentals",  semester:1, w:W({0:2, 2:1})},
  {code:"CS110", name:"Engineering Mathematics 1", semester:1, w:W({0:1, 1:2})},
  {code:"CS120", name:"Discrete Mathematics",      semester:2, w:W({1:1, 0:1})},
  {code:"CS201", name:"Web Programming",           semester:3, w:W({3:3, 4:1})},
  {code:"CS210", name:"Data Structures",           semester:3, w:W({2:2, 1:1})},
  {code:"CS220", name:"Computer Architecture",     semester:4, w:W({4:3, 0:1})},
  {code:"CS305", name:"Database Systems",          semester:5, w:W({5:2, 2:1})},
  {code:"CS310", name:"Computer Networks",         semester:5, w:W({6:2, 4:1})},
  {code:"CS320", name:"Software Engineering",      semester:6, w:W({2:2, 8:1, 9:1})},
  {code:"CS400", name:"Engineering Ethics",        semester:6, w:W({7:2, 5:1})},
  {code:"CS499", name:"Final Year Project",        semester:8, w:W({2:1, 3:1, 9:2, 10:2})},
];


/* ============================================================
   ENSEIGNANTS
   ============================================================ */
const LECTURERS = {
  L1: {name:"Dr. Lee Wei",    login:"lee.staff"},
  L2: {name:"Dr. Siti Aminah",login:"siti.staff"},
  L3: {name:"Dr. Raj Kumar",  login:"raj.staff"},
};


/* ============================================================
   ANNÉES DE COMPARAISON
   ============================================================ */
const CUR_YEAR = 2026;
const COMPARE_YEARS = [2025, 2024, 2023, 2022];

/*
  Génère un historique simulé pour les années précédentes.
  Applique un facteur de dégradation progressif + léger bruit.
  cum : tableau de scores PO actuels (valeurs de référence).
*/
function makeHistory(cum) {
  const h = {};
  COMPARE_YEARS.forEach((yr, k) => {
    const f = [0.97, 0.93, 0.90, 0.86][k];
    h[yr] = cum.map((v, i) =>
      v === 0 ? 0 : Math.max(0, Math.min(100, Math.round(v * f + ((i * 7 + yr) % 9 - 4))))
    );
  });
  return h;
}


/* ============================================================
   PROMOTIONS (BATCHES)
   progress = dernier semestre enseigné pour cette promotion.
   ============================================================ */
const BATCHES = {
  B7: {num:7, name:"Batch 7", year:CUR_YEAR, session:"A251", progress:3, owner:"L1", comment:"", students:[]},
  B6: {num:6, name:"Batch 6", year:CUR_YEAR, session:"A242", progress:8, owner:"L2", comment:"Strong cohort on PO2/PO3. PO9-PO10 to strengthen via integrative projects.", students:[]},
  B5: {num:5, name:"Batch 5", year:CUR_YEAR, session:"A232", progress:8, owner:"L1", comment:"", students:[]},
  B4: {num:4, name:"Batch 4", year:CUR_YEAR, session:"A222", progress:8, owner:"L3", comment:"", students:[]},
};


/* ============================================================
   GÉNÉRATION DES ÉTUDIANTS (données fictives)
   ============================================================ */

/* Noms fictifs typiquement malaisiens */
const NAMES = [
  "Ahmad bin Ali", "Nurul Ain binti Hassan", "Tan Wei Ming", "Priya Devi",
  "Mohd Faiz bin Razak", "Lim Jia Hui", "Siti Khadijah binti Omar",
  "Arjun Kumar", "Chong Mei Ling", "Hafiz bin Yusof",
];

/* Entier aléatoire entre min et max (inclus) */
function rnd(min, max) { return Math.round(min + Math.random() * (max - min)); }

/* Génère un matricule réaliste selon le batch (ex: "A21EC0120") */
function matricFor(bid, i) {
  const pref = {B7:"A21EC0", B6:"A20EC0", B5:"A19EC0", B4:"A18EC0"}[bid];
  const base = {B7:120, B6:80, B5:60, B4:40}[bid];
  return pref + (base + i);
}

/* Stockage global de tous les étudiants, indexé par ID interne */
const STUDENTS = {};
let _sid = 0;

/* Génération automatique : 6 étudiants pour B7, 4 pour les autres */
Object.keys(BATCHES).forEach(bid => {
  const count = bid === 'B7' ? 6 : 4;
  const prog  = BATCHES[bid].progress;
  for (let i = 0; i < count; i++) {
    _sid++;
    const id = "s" + _sid;
    const cs = {};
    /* Score aléatoire pour chaque cours déjà enseigné.
       12% de chance d'échouer (score 22-49), sinon succès (52-96). */
    COURSES.filter(c => c.semester <= prog).forEach(c => {
      cs[c.code] = Math.random() < 0.12 ? rnd(22, 49) : rnd(52, 96);
    });
    STUDENTS[id] = {id, batch:bid, matric:matricFor(bid, i), name:NAMES[(_sid - 1) % NAMES.length], courseScores:cs};
    BATCHES[bid].students.push(id);
  }
});

/* Scores fixes pour l'étudiant démo (Batch 7, semestres 1-3) */
STUDENTS.s1.courseScores = {CS101:78, CS110:84, CS120:66, CS201:92, CS210:80};


/* ============================================================
   FONCTIONS DE CALCUL
   Toutes les valeurs PO dérivent des scores de cours.
   ============================================================ */

/* Moyenne arithmétique, arrondie à l'entier */
function mean(a) {
  return a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0;
}

/* Moyenne pondérée. pairs = [[valeur, poids], ...] */
function wmean(pairs) {
  let sw = 0, swv = 0;
  for (const [v, w] of pairs) { sw += w; swv += v * w; }
  return sw > 0 ? Math.round(swv / sw) : 0;
}

/* Alias lisible de mean() */
function avgOf(a) { return mean(a); }

/* Retourne les cours d'un étudiant triés par semestre */
function studentCourses(stu) {
  return COURSES.filter(c => c.code in stu.courseScores).slice().sort((a, b) => a.semester - b.semester);
}

/*
  Calcule les 11 scores PO d'un étudiant.
  uptoSem : numéro de semestre max, ou 'all' pour tout inclure.
*/
function studentPO(stu, uptoSem) {
  return POS.map((_, p) => {
    const pairs = COURSES
      .filter(c => c.w[p] > 0 && (c.code in stu.courseScores) && (uptoSem === 'all' || c.semester <= uptoSem))
      .map(c => [stu.courseScores[c.code], c.w[p]]);
    return wmean(pairs);
  });
}

/*
  Atteinte d'un cours pour un batch entier = moyenne des scores de tous les étudiants.
  Retourne null si aucune donnée disponible.
*/
function courseAttainment(batchId, code) {
  const ids = BATCHES[batchId].students.filter(id => code in STUDENTS[id].courseScores);
  if (!ids.length) return null;
  return mean(ids.map(id => STUDENTS[id].courseScores[code]));
}

/* Liste les cours d'un batch jusqu'à un semestre donné, triés par semestre */
function batchCourses(batchId, uptoSem) {
  return COURSES
    .filter(c =>
      (uptoSem === 'all' || c.semester <= uptoSem) &&
      BATCHES[batchId].students.some(id => c.code in STUDENTS[id].courseScores)
    )
    .slice().sort((a, b) => a.semester - b.semester);
}

/* Calcule les 11 scores PO pour un batch entier (moyenne pondérée par cours) */
function batchPO(batchId, uptoSem) {
  return POS.map((_, p) => {
    const pairs = COURSES
      .filter(c => c.w[p] > 0 && (uptoSem === 'all' || c.semester <= uptoSem))
      .map(c => [courseAttainment(batchId, c.code), c.w[p]])
      .filter(x => x[0] != null);
    return wmean(pairs);
  });
}

/* Retourne [1, 2, ..., progress, 'all'] — liste des semestres navigables */
function semOrder(progress) {
  const a = [];
  for (let i = 1; i <= progress; i++) a.push(i);
  a.push('all');
  return a;
}

/* Retourne les IDs des batches dont cet enseignant est responsable */
function lecturerBatches(lid) {
  return Object.keys(BATCHES).filter(id => BATCHES[id].owner === lid);
}

/*
  Retourne les batches visibles selon le rôle connecté et le filtre actif.
  Dépend de `state` (défini dans state.js), appelé uniquement à l'exécution.
*/
function visibleBatches() {
  if (state.role === 'lecturer') return lecturerBatches(state.lect.lecturer);
  return state.lect.filter === 'all' ? Object.keys(BATCHES) : lecturerBatches(state.lect.filter);
}

/* Pré-calcul de l'historique de chaque batch pour la comparaison par année */
Object.keys(BATCHES).forEach(id => { BATCHES[id].history = makeHistory(batchPO(id, 'all')); });


/* ============================================================
   REGISTRE DES FICHIERS IMPORTÉS
   ============================================================ */
const IMPORTS = [];

/* Enregistre un fichier importé en tête de liste */
function regImport(filename, batchId, rows) {
  IMPORTS.unshift({
    id: "f" + Date.now() + "_" + Math.floor(Math.random() * 1e4),
    filename,
    batch: batchId,
    importedAt: new Date().toISOString().slice(0, 10),
    rows,
  });
}

/* Deux fichiers de démonstration présents au chargement */
regImport(
  "Batch7_course_attainment_A251.csv", "B7",
  BATCHES.B7.students.flatMap(id => {
    const s = STUDENTS[id];
    return Object.keys(s.courseScores).map(code => ({matric:s.matric, name:s.name, course:code, att:s.courseScores[code]}));
  })
);
regImport("Batch6_course_attainment.csv", "B6", [
  {matric:"A20EC0080", name:"Wong Kai Xin", course:"CS499", att:84},
  {matric:"A20EC0081", name:"Devakumar R.", course:"CS499", att:77},
]);
