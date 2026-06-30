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

/*
  Génère un mot de passe temporaire de 10 caractères.
  Évite les caractères ambigus (0/O, 1/l/I).
*/
export function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}


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
   DONNÉES DE DÉMONSTRATION
   6 étudiants dans B7 (3 Engineering + 3 Programming),
   2 étudiants dans B6 (1 Engineering + 1 Programming),
   2 enseignants (L1 → B7, L2 → B6).
   ============================================================ */

export const INITIAL_STUDENTS = {
  /* ---- Batch 7 · Engineering ---- */
  test_s1: {
    id: "test_s1", firstName: "Ahmad",  lastName: "Ali",
    name: "Ahmad Ali",   matric: "A251001", batch: "B7", program: "Engineering",
    courseScores: { CS101: 75, CS110: 68, CS120: 72, CS201: 80, CS210: 65 },
    password: "Test1234", mustChangePassword: false,
  },
  s_aisha: {
    id: "s_aisha", firstName: "Aisha",  lastName: "Rahman",
    name: "Aisha Rahman", matric: "A251002", batch: "B7", program: "Engineering",
    courseScores: { CS101: 85, CS110: 78, CS120: 82, CS201: 88, CS210: 79 },
    password: "Test1234", mustChangePassword: false,
  },
  s_raj: {
    id: "s_raj", firstName: "Raj", lastName: "Kumar",
    name: "Raj Kumar", matric: "A251003", batch: "B7", program: "Engineering",
    courseScores: { CS101: 58, CS110: 45, CS120: 52, CS201: 61, CS210: 48 },
    password: "Test1234", mustChangePassword: false,
  },

  /* ---- Batch 7 · Programming ---- */
  s_mei: {
    id: "s_mei", firstName: "Mei", lastName: "Lin",
    name: "Mei Lin", matric: "A251004", batch: "B7", program: "Programming",
    courseScores: { CS101: 92, CS110: 55, CS120: 63, CS201: 95, CS210: 88 },
    password: "Test1234", mustChangePassword: false,
  },
  s_farid: {
    id: "s_farid", firstName: "Farid", lastName: "Hassan",
    name: "Farid Hassan", matric: "A251005", batch: "B7", program: "Programming",
    courseScores: { CS101: 70, CS110: 48, CS120: 58, CS201: 74, CS210: 67 },
    password: "Test1234", mustChangePassword: false,
  },
  s_priya: {
    id: "s_priya", firstName: "Priya", lastName: "Nair",
    name: "Priya Nair", matric: "A251006", batch: "B7", program: "Programming",
    courseScores: { CS101: 82, CS110: 62, CS120: 70, CS201: 86, CS210: 75 },
    password: "Test1234", mustChangePassword: false,
  },

  /* ---- Batch 6 · Engineering ---- */
  s_lim: {
    id: "s_lim", firstName: "Sook", lastName: "Lim",
    name: "Sook Lim", matric: "A242001", batch: "B6", program: "Engineering",
    courseScores: { CS101: 80, CS110: 72, CS120: 75, CS201: 82, CS210: 78, CS220: 70, CS305: 65, CS310: 68, CS320: 74, CS400: 80 },
    password: "Test1234", mustChangePassword: false,
  },

  /* ---- Batch 6 · Programming ---- */
  s_zara: {
    id: "s_zara", firstName: "Zara", lastName: "Ibrahim",
    name: "Zara Ibrahim", matric: "A242002", batch: "B6", program: "Programming",
    courseScores: { CS101: 88, CS110: 60, CS120: 65, CS201: 92, CS210: 85, CS220: 72, CS305: 70, CS310: 75, CS320: 80, CS400: 75 },
    password: "Test1234", mustChangePassword: false,
  },
};

export const INITIAL_LECTURERS = {
  L1: {
    id: "L1", firstName: "Lee", lastName: "Wei", name: "Dr. Lee Wei",
    email: "lee.wei@univ.edu", courses: [], batch: "B7",
    password: "Test1234", mustChangePassword: false,
  },
  L2: {
    id: "L2", firstName: "Sarah", lastName: "Chen", name: "Dr. Sarah Chen",
    email: "sarah.chen@univ.edu", courses: [], batch: "B6",
    password: "Test1234", mustChangePassword: false,
  },
};


/* ============================================================
   PROMOTIONS (BATCHES)
   ============================================================ */
export const CUR_YEAR = 2026;
export const COMPARE_YEARS = [2025, 2024, 2023, 2022];

export const INITIAL_BATCHES = {
  B7: {
    num: 7, name: "Batch 7", year: CUR_YEAR, session: "A251", progress: 3, owner: "L1",
    students: ["test_s1", "s_aisha", "s_raj", "s_mei", "s_farid", "s_priya"],
    comment: "Batch engagé, bon dynamisme. Engineering au-dessus du seuil sur tous les POs sem. 1-2. Surveiller CS110 pour les Programming students.",
    courseComments: {
      CS101: "Très bons résultats globalement. TD pratiques efficaces, bonne adhésion.",
      CS110: "Module difficile pour les non-Engineering. Renforcement mathématique recommandé avant sem. 2.",
      CS120: "Bonne participation. Notions de graphes et logique propositionnelle bien assimilées.",
      CS201: "Excellents résultats, notamment chez les Programming students. PO4 bien couvert.",
      CS210: "Attention à Raj Kumar et Farid Hassan — scores sous le seuil. Révisions ciblées prévues.",
    },
  },
  B6: {
    num: 6, name: "Batch 6", year: CUR_YEAR, session: "A242", progress: 8, owner: "L2",
    students: ["s_lim", "s_zara"],
    comment: "Promotion solide avec des résultats cohérents sur l'ensemble du cursus. Forte progression du PO2 au fil des semestres.",
    courseComments: {
      CS101: "Résultats solides dès le premier cours. Bonne base pour la suite.",
      CS220: "Architecture bien maîtrisée — forte contribution au PO5.",
      CS305: "Résultats légèrement en dessous pour Engineering. Point à surveiller.",
    },
  },
  B5: { num: 5, name: "Batch 5", year: CUR_YEAR, session: "A232", progress: 8, owner: "L1", comment: "", students: [], courseComments: {} },
  B4: { num: 4, name: "Batch 4", year: CUR_YEAR, session: "A222", progress: 8, owner: "L1", comment: "", students: [], courseComments: {} },
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
