/* ============================================================
   state.js — État global, routeur, login et moteur de rendu
   Chargé en dernier : dépend de tous les autres fichiers.
   ============================================================ */


/* ============================================================
   ÉTAT GLOBAL (STATE)
   Objet central qui pilote toute l'interface.
   Les fonctions de rendu lisent cet objet pour savoir quoi afficher.
   ============================================================ */
const state = {
  view: "login", /* Vue courante : "login" | "student" | "lect-batches" | "lect-student" | "admin" */
  role: null,    /* Rôle connecté : null | "student" | "lecturer" | "admin" */

  /* Sous-état de la vue étudiant */
  student: {
    id:       null,  /* ID interne de l'étudiant affiché — défini au login */
    sem:      1,     /* Semestre sélectionné (1..progress ou 'all') */
    showMine: true,  /* Afficher les scores perso sur le radar */
    showAvg:  false, /* Afficher la moyenne du batch sur le radar */
  },

  /* Sous-état de la vue enseignant */
  lect: {
    batch:       null,  /* Batch sélectionné — défini au login */
    sem:         1,     /* Semestre sélectionné */
    compare:     false, /* Comparaison par année activée */
    compareYear: 2025,  /* Année de comparaison sélectionnée */
    studentId:   null,  /* ID de l'étudiant en vue détail */
    lecturer:    null,  /* Enseignant connecté — défini au login */
    filter:      "all", /* Filtre par enseignant (admin uniquement) */
  },

  /* Sous-état de la vue admin */
  admin: {
    fileId:      null,                       /* ID du fichier actuellement prévisualisé */
    targetBatch: Object.keys(BATCHES)[0],    /* Premier batch disponible */
    editSemCi:   -1,                         /* Index du cours dont on édite le semestre (-1 = aucun) */
  },
};

/* Référence au div #root dans lequel tout le HTML de l'app est injecté */
const root = document.getElementById("root");


/* ============================================================
   ROUTEUR
   ============================================================ */

/*
  Change la vue courante et redessine l'interface.
  Revient en haut de page à chaque changement de vue.
*/
function go(v) { state.view = v; render(); window.scrollTo(0, 0); }

/*
  Affiche un message toast pendant 2,2 secondes.
  Exemple : toast("Commentaire sauvegardé")
*/
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 2200);
}


/* ============================================================
   BARRE DE NAVIGATION (générée dynamiquement selon le rôle)
   ============================================================ */
function appbar() {
  /* Pas de barre sur la page de connexion */
  if (state.view === "login") return "";

  /* Badge et nom affichés à droite selon le rôle */
  const role = state.role === "student"
    ? `<span class="pill">Student</span><span>${STUDENTS[state.student.id].name}</span>`
    : state.role === "admin"
    ? `<span class="pill blue">Admin</span><span>Registrar</span>`
    : `<span class="pill amber">Lecturer</span><span>${LECTURERS[state.lect.lecturer] ? LECTURERS[state.lect.lecturer].name : 'Lecturer'}</span>`;

  /* Navigation par onglets : uniquement visible pour l'admin */
  const nav = state.role === "admin" ? `
    <nav class="topnav">
      <button class="${state.view === 'admin' ? 'on' : ''}" onclick="go('admin')">Console</button>
      <button class="${state.view.indexOf('lect') === 0 ? 'on' : ''}" onclick="go('lect-batches')">Lecturer</button>
      <button class="${state.view === 'student' ? 'on' : ''}" onclick="adminStudentView()">Student</button>
    </nav>` : "";

  return `<div class="appbar">
    <div class="brand"><span class="dot"></span><span>PO Attainment Tracker</span><small>OBE</small></div>
    ${nav}
    <div class="spacer"></div>
    <div class="ctx">${role}</div>
    <button class="linkbtn" onclick="logout()">Sign out</button>
  </div>`;
}


/* ============================================================
   VUE : CONNEXION
   ============================================================ */
let loginRole = "student"; /* Rôle sélectionné dans le formulaire de connexion */

/* Génère le HTML du formulaire de connexion */
function viewLogin() {
  return `<div class="login-stage"><div class="login-card view">
    <div class="eyebrow">Outcome-Based Education</div>
    <h1>PO Attainment Tracker</h1>

    <!-- Sélecteur de rôle segmenté -->
    <div class="seg">
      <button class="${loginRole === 'student'  ? 'on' : ''}" onclick="setLoginRole('student')">Student</button>
      <button class="${loginRole === 'lecturer' ? 'on' : ''}" onclick="setLoginRole('lecturer')">Lecturer</button>
      <button class="${loginRole === 'admin'    ? 'on' : ''}" onclick="setLoginRole('admin')">Admin</button>
    </div>

    <!-- Champs : matricule pour l'étudiant, username+password pour les autres -->
    ${loginRole === 'student' ? `
      <div class="field"><label>Student ID (matric)</label><input id="li-id" placeholder="Enter your matric number" autocomplete="off"></div>
    ` : `
      <div class="field"><label>Username</label>
        <input id="li-id" placeholder="Enter your username" autocomplete="off">
      </div>
      <div class="field"><label>Password</label><input id="li-pw" type="password" placeholder="Enter your password"></div>
    `}

    <button class="btn primary" style="width:100%;justify-content:center;height:42px" onclick="doLogin()">
      ${loginRole === 'student' ? 'View my results' : loginRole === 'admin' ? 'Open admin console' : 'Open lecturer space'}
    </button>
  </div></div>`;
}

/* Met à jour le rôle sélectionné dans le formulaire et redessine */
function setLoginRole(r) { loginRole = r; render(); }

/* Traite la soumission du formulaire de connexion */
function doLogin() {
  if (loginRole === 'student') {
    /* Recherche l'étudiant par matricule (insensible à la casse) */
    const id  = (document.getElementById("li-id").value || "").trim().toUpperCase();
    const stu = Object.values(STUDENTS).find(s => s.matric.toUpperCase() === id);
    if (!stu) { toast("No student for this matric"); return; }
    state.role = "student";
    state.student.id  = stu.id;
    state.student.sem = 1;
    go("student");

  } else if (loginRole === 'admin') {
    /* Accès admin direct sans vérification (prototype) */
    state.role = "admin";
    go("admin");

  } else {
    /* Enseignant : cherche le login et ouvre le premier batch dont il est responsable */
    const idv = (document.getElementById("li-id").value || "").trim().toLowerCase();
    const f   = Object.entries(LECTURERS).find(([id, l]) => l.login === idv);
    state.role = "lecturer";
    state.lect.lecturer = f ? f[0] : "L1";
    state.lect.batch    = lecturerBatches(state.lect.lecturer)[0] || Object.keys(BATCHES)[0];
    state.lect.sem      = 1;
    go("lect-batches");
  }
}

/* Déconnexion : remet l'état à zéro et retourne à la page de connexion */
function logout() { state.role = null; loginRole = "student"; go("login"); }

/* L'admin peut accéder à la vue étudiant pour n'importe quel étudiant */
function adminStudentView() {
  if (!STUDENTS[state.student.id]) state.student.id = Object.keys(STUDENTS)[0];
  go("student");
}


/* ============================================================
   MOTEUR DE RENDU PRINCIPAL
   Lit state.view et injecte le HTML correspondant dans #root.
   ============================================================ */
function render() {
  let html = "";
  switch (state.view) {
    case "login":        html = viewLogin();        break; /* Défini dans ce fichier */
    case "student":      html = viewStudent();      break; /* Défini dans student.js */
    case "lect-batches": html = viewLectBatches();  break; /* Défini dans lecturer.js */
    case "lect-student": html = viewLectStudent();  break; /* Défini dans lecturer.js */
    case "admin":        html = viewAdmin();        break; /* Défini dans admin.js */
  }
  root.innerHTML = html;
}

/* Premier rendu au chargement : affiche la page de connexion */
render();
