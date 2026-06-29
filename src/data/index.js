/* ============================================================
   data/index.js — Constantes, données initiales et fonctions de calcul
   Module ES pur : aucune dépendance React.
   ============================================================ */


/* ---- Seuil de réussite ---- */
export const PASS = 50;

/* ---- Liste des 11 Programme Outcomes ---- */
export const POS = Array.from({ length: 11 }, (_, i) => 'PO' + (i + 1));

/* ---- Descriptions longues des POs ---- */
export const PO_LABELS = [
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

/* ---- Programmes disponibles dans l'établissement ---- */
export const PROGRAMS = [
  "Engineering",
  "Programming",
  "Networking",
  "Data Science",
  "Cybersecurity",
];

/* ---- Identifiants de l'administrateur (prototype) ---- */
export const ADMIN_CREDENTIALS = { login: "admin", password: "admin" };


/* ============================================================
   MATRICE CO-PO
   ============================================================ */

/*
  Construit un tableau de 11 coefficients depuis un dictionnaire.
  Exemple : W({0:2, 2:1}) → [2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]
*/
export function W(map) {
  const a = Array(11).fill(0);
  for (const k in map) a[+k] = map[k];
  return a;
}

/* Curriculum de référence */
export const INITIAL_COURSES = [
  { code: "CS101", name: "Programming Fundamentals",  semester: 1, w: W({ 0: 2, 2: 1 }) },
  { code: "CS110", name: "Engineering Mathematics 1", semester: 1, w: W({ 0: 1, 1: 2 }) },
  { code: "CS120", name: "Discrete Mathematics",      semester: 2, w: W({ 1: 1, 0: 1 }) },
  { code: "CS201", name: "Web Programming",           semester: 3, w: W({ 3: 3, 4: 1 }) },
  { code: "CS210", name: "Data Structures",           semester: 3, w: W({ 2: 2, 1: 1 }) },
  { code: "CS220", name: "Computer Architecture",     semester: 4, w: W({ 4: 3, 0: 1 }) },
  { code: "CS305", name: "Database Systems",          semester: 5, w: W({ 5: 2, 2: 1 }) },
  { code: "CS310", name: "Computer Networks",         semester: 5, w: W({ 6: 2, 4: 1 }) },
  { code: "CS320", name: "Software Engineering",      semester: 6, w: W({ 2: 2, 8: 1, 9: 1 }) },
  { code: "CS400", name: "Engineering Ethics",        semester: 6, w: W({ 7: 2, 5: 1 }) },
  { code: "CS499", name: "Final Year Project",        semester: 8, w: W({ 2: 1, 3: 1, 9: 2, 10: 2 }) },
];


/* ============================================================
   DONNÉES DE TEST
   Un seul étudiant, un seul enseignant — suffisant pour valider
   toutes les fonctionnalités sans données fictives.
   ============================================================ */

/*
  Modèle étudiant :
    id, firstName, lastName, name, matric, batch, program, courseScores
*/
export const INITIAL_STUDENTS = {
  test_s1: {
    id:           "test_s1",
    firstName:    "Ahmad",
    lastName:     "Ali",
    name:         "Ahmad Ali",
    matric:       "A251001",  /* Généré : session du batch + numéro d'ordre */
    batch:        "B7",
    program:      "Engineering",
    courseScores: {},
  },
};

/*
  Modèle enseignant :
    id, firstName, lastName, name, login, courses (codes des cours enseignés), batch (batch référent)
*/
export const INITIAL_LECTURERS = {
  L1: {
    id:        "L1",
    firstName: "Lee",
    lastName:  "Wei",
    name:      "Dr. Lee Wei",
    login:     "lee.staff",
    courses:   [],   /* Codes des cours dont cet enseignant est responsable */
    batch:     "B7", /* Batch dont il est le référent */
  },
};


/* ============================================================
   PROMOTIONS (BATCHES)
   Tous les batches sont initialement rattachés au seul enseignant test (L1).
   ============================================================ */
export const CUR_YEAR = 2026;
export const COMPARE_YEARS = [2025, 2024, 2023, 2022];

export const INITIAL_BATCHES = {
  B7: { num: 7, name: "Batch 7", year: CUR_YEAR, session: "A251", progress: 3, owner: "L1", comment: "", students: ["test_s1"] },
  B6: { num: 6, name: "Batch 6", year: CUR_YEAR, session: "A242", progress: 8, owner: "L1", comment: "", students: [] },
  B5: { num: 5, name: "Batch 5", year: CUR_YEAR, session: "A232", progress: 8, owner: "L1", comment: "", students: [] },
  B4: { num: 4, name: "Batch 4", year: CUR_YEAR, session: "A222", progress: 8, owner: "L1", comment: "", students: [] },
};


/* ============================================================
   UTILITAIRES D'IMPORT
   ============================================================ */

/*
  Génère un matricule unique pour un étudiant importé.
  Format : {session du batch}{numéro d'ordre sur 3 chiffres}
  Exemple : "A251" + 3 étudiants existants → "A251004"
*/
export function generateMatric(batchId, batches) {
  const batch = batches[batchId];
  if (!batch) return 'USR' + Date.now().toString().slice(-5);
  const n = batch.students.length + 1;
  return batch.session + String(n).padStart(3, '0');
}

/*
  Génère un login unique pour un enseignant importé.
  Format : {prenom}.{nom}.staff (minuscules, sans accents)
  Exemple : "Lee", "Wei" → "lee.wei.staff"
*/
export function generateLogin(firstName, lastName) {
  const clean = s => s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') /* Supprime les accents */
    .replace(/\s+/g, '');
  return `${clean(firstName)}.${clean(lastName)}.staff`;
}


/* ============================================================
   FONCTIONS DE CALCUL (pures — reçoivent les données en paramètre)
   ============================================================ */

export function mean(a) {
  return a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0;
}

export function wmean(pairs) {
  let sw = 0, swv = 0;
  for (const [v, w] of pairs) { sw += w; swv += v * w; }
  return sw > 0 ? Math.round(swv / sw) : 0;
}

export function avgOf(a) { return mean(a); }

/* Retourne [1, 2, ..., progress, 'all'] */
export function semOrder(progress) {
  const a = [];
  for (let i = 1; i <= progress; i++) a.push(i);
  a.push('all');
  return a;
}

export function studentCourses(stu, courses) {
  return courses
    .filter(c => c.code in stu.courseScores)
    .slice()
    .sort((a, b) => a.semester - b.semester);
}

export function studentPO(stu, uptoSem, courses) {
  return POS.map((_, p) => {
    const pairs = courses
      .filter(c => c.w[p] > 0 && (c.code in stu.courseScores) && (uptoSem === 'all' || c.semester <= uptoSem))
      .map(c => [stu.courseScores[c.code], c.w[p]]);
    return wmean(pairs);
  });
}

export function courseAttainment(batchId, code, batches, students) {
  const ids = batches[batchId].students.filter(id => code in students[id].courseScores);
  if (!ids.length) return null;
  return mean(ids.map(id => students[id].courseScores[code]));
}

export function batchCourses(batchId, uptoSem, batches, students, courses) {
  return courses
    .filter(c =>
      (uptoSem === 'all' || c.semester <= uptoSem) &&
      batches[batchId].students.some(id => c.code in students[id].courseScores)
    )
    .slice()
    .sort((a, b) => a.semester - b.semester);
}

export function batchPO(batchId, uptoSem, batches, students, courses) {
  return POS.map((_, p) => {
    const pairs = courses
      .filter(c => c.w[p] > 0 && (uptoSem === 'all' || c.semester <= uptoSem))
      .map(c => [courseAttainment(batchId, c.code, batches, students), c.w[p]])
      .filter(x => x[0] != null);
    return wmean(pairs);
  });
}

export function lecturerBatches(lid, batches) {
  return Object.keys(batches).filter(id => batches[id].owner === lid);
}

export function visibleBatches(role, lectState, batches) {
  if (role === 'lecturer') return lecturerBatches(lectState.lecturer, batches);
  return lectState.filter === 'all'
    ? Object.keys(batches)
    : lecturerBatches(lectState.filter, batches);
}

export function makeHistory(cum) {
  const h = {};
  COMPARE_YEARS.forEach((yr, k) => {
    const f = [0.97, 0.93, 0.90, 0.86][k];
    h[yr] = cum.map((v, i) =>
      v === 0 ? 0 : Math.max(0, Math.min(100, Math.round(v * f + ((i * 7 + yr) % 9 - 4))))
    );
  });
  return h;
}
