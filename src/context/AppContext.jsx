/* ============================================================
   context/AppContext.jsx — État global de l'application
   Remplace l'objet `state` et le routeur de state.js (version vanilla).

   Architecture :
     - useReducer  : gère toutes les mutations de données et de navigation
                     via des actions typées (immuabilité garantie).
     - AppProvider : composant racine qui expose le contexte à l'arbre entier.
     - useApp()    : hook consommateur — utilisé dans chaque vue/composant.
   ============================================================ */

import { createContext, useContext, useReducer, useState, useCallback, useRef } from 'react';
import {
  INITIAL_COURSES,
  INITIAL_LECTURERS,
  INITIAL_BATCHES,
  INITIAL_STUDENTS,
} from '../data/index.js';


/* ============================================================
   ÉTAT INITIAL
   Toutes les vues et données démarrent ici.
   ============================================================ */
const INIT = {
  /* ---- Navigation ---- */
  view:      'login',   /* Vue courante : 'login' | 'student' | 'lect-batches' | 'lect-student' | 'admin' */
  role:      null,      /* Rôle connecté : null | 'student' | 'lecturer' | 'admin' */
  loginRole: 'student', /* Onglet actif sur le formulaire de connexion */

  /* ---- Sous-état de la vue étudiant ---- */
  student: {
    id:       null,  /* ID interne de l'étudiant affiché — défini au login */
    sem:      1,     /* Semestre sélectionné (1..progress ou 'all') */
    showMine: true,  /* Afficher les scores perso sur le radar */
    showAvg:  false, /* Afficher la moyenne du batch sur le radar */
  },

  /* ---- Sous-état de la vue enseignant ---- */
  lect: {
    batch:       null,  /* Batch sélectionné — défini au login */
    sem:         1,     /* Semestre sélectionné */
    compare:     false, /* Comparaison par année activée */
    compareYear: 2025,  /* Année de comparaison sélectionnée */
    studentId:   null,  /* ID de l'étudiant en vue détail */
    lecturer:    null,  /* Enseignant connecté — défini au login */
    filter:      'all', /* Filtre par enseignant (admin uniquement) */
  },

  /* ---- Sous-état de la vue admin ---- */
  admin: {
    fileId:      null,                      /* ID du fichier prévisualisé (null = aucun) */
    targetBatch: Object.keys(INITIAL_BATCHES)[0], /* Batch cible pour l'import */
    editSemCi:   -1,                        /* Index du cours en édition de semestre (-1 = aucun) */
  },

  /* ---- Données métier (mutables via le reducer) ---- */
  courses:   INITIAL_COURSES,   /* Liste des cours du curriculum */
  lecturers: INITIAL_LECTURERS, /* Dictionnaire des enseignants */
  batches:   INITIAL_BATCHES,   /* Dictionnaire des promotions */
  students:  INITIAL_STUDENTS,  /* Dictionnaire des étudiants */
  imports:   [],                /* Registre des fichiers importés */
};


/* ============================================================
   REDUCER
   Chaque action retourne un nouvel état (immuable).
   Le switch couvre toutes les mutations possibles de l'app.
   ============================================================ */
function reducer(state, action) {
  switch (action.type) {

    /* Changement de vue (routage) */
    case 'GO':
      return { ...state, view: action.view };

    /* Sélection d'un onglet dans le formulaire de connexion */
    case 'SET_LOGIN_ROLE':
      return { ...state, loginRole: action.role };

    /* Connexion : met à jour le rôle, la vue et les sous-états selon le rôle */
    case 'LOGIN': {
      const { role, studentId, lecturer, batch } = action;
      return {
        ...state,
        role,
        /* Redirige vers la bonne vue selon le rôle */
        view: role === 'student' ? 'student' : role === 'admin' ? 'admin' : 'lect-batches',
        /* Initialise le sous-état étudiant si on se connecte en tant qu'étudiant */
        student: role === 'student'
          ? { ...state.student, id: studentId, sem: 1 }
          : state.student,
        /* Initialise le sous-état enseignant si applicable */
        lect: (role === 'lecturer' || role === 'admin')
          ? { ...state.lect, lecturer: lecturer ?? state.lect.lecturer, batch: batch ?? state.lect.batch, sem: 1 }
          : state.lect,
      };
    }

    /* Déconnexion : réinitialise la navigation mais conserve les données importées */
    case 'LOGOUT':
      return {
        ...INIT,
        batches:  state.batches,
        students: state.students,
        imports:  state.imports,
        courses:  state.courses,
      };

    /* Mise à jour partielle du sous-état étudiant (patch = objet partiel) */
    case 'SET_STUDENT':
      return { ...state, student: { ...state.student, ...action.patch } };

    /* Mise à jour partielle du sous-état enseignant */
    case 'SET_LECT':
      return { ...state, lect: { ...state.lect, ...action.patch } };

    /* Mise à jour partielle du sous-état admin */
    case 'SET_ADMIN':
      return { ...state, admin: { ...state.admin, ...action.patch } };

    /* Réassignation d'un batch à un autre enseignant */
    case 'SET_BATCH_OWNER': {
      const batches = {
        ...state.batches,
        [action.batchId]: { ...state.batches[action.batchId], owner: action.lid },
      };
      return { ...state, batches };
    }

    /* Sauvegarde du commentaire libre d'un batch */
    case 'SAVE_COMMENT': {
      const batches = {
        ...state.batches,
        [action.batchId]: { ...state.batches[action.batchId], comment: action.comment },
      };
      return { ...state, batches };
    }

    /* Modification du coefficient d'un cours pour un PO donné */
    case 'SET_COURSE_W': {
      const val = Math.max(0, parseInt(action.val || 0, 10) || 0);
      const courses = state.courses.map((c, i) =>
        i === action.ci
          ? { ...c, w: c.w.map((v, pi) => pi === action.pi ? val : v) }
          : c
      );
      return { ...state, courses };
    }

    /* Modification du semestre d'un cours (borné entre 1 et 8) */
    case 'SET_COURSE_SEM': {
      const sem = Math.max(1, Math.min(8, parseInt(action.val || 1, 10)));
      const courses = state.courses.map((c, i) =>
        i === action.ci ? { ...c, semester: sem } : c
      );
      return { ...state, courses };
    }

    /* Ajout d'un nouveau cours avec des coefficients vides */
    case 'ADD_COURSE': {
      const newCourse = {
        code:     action.code || 'NEW',
        name:     action.name || 'Untitled course',
        semester: action.sem,
        w:        Array(11).fill(0),
      };
      return { ...state, courses: [...state.courses, newCourse] };
    }

    /* Suppression d'un cours (par son index dans le tableau) */
    case 'DEL_COURSE': {
      const courses = state.courses.filter((_, i) => i !== action.ci);
      return { ...state, courses, admin: { ...state.admin, editSemCi: -1 } };
    }

    /* Import d'un fichier CSV : crée ou met à jour les étudiants concernés */
    case 'IMPORT_FILE': {
      const { filename, batchId, rows } = action;
      let students = { ...state.students };
      /* Copie de la liste d'étudiants du batch cible */
      const batchStudents = [...state.batches[batchId].students];

      rows.forEach(({ matric, name, course, att }) => {
        /* Recherche d'un étudiant existant par son matricule (insensible à la casse) */
        const existing = Object.values(students).find(
          s => s.matric.toUpperCase() === matric.toUpperCase()
        );
        if (existing) {
          /* Étudiant existant : on ajoute/écrase le score du cours */
          students = {
            ...students,
            [existing.id]: {
              ...existing,
              courseScores: { ...existing.courseScores, [course]: att },
            },
          };
        } else {
          /* Nouvel étudiant : création et ajout au batch */
          const id = 'imp' + Object.keys(students).length;
          students = {
            ...students,
            [id]: { id, batch: batchId, matric, name: name || matric, courseScores: { [course]: att } },
          };
          batchStudents.push(id);
        }
      });

      /* Mise à jour du batch avec la nouvelle liste d'étudiants */
      const batches = {
        ...state.batches,
        [batchId]: { ...state.batches[batchId], students: batchStudents },
      };

      /* Enregistrement du fichier dans le registre (en tête de liste) */
      const entry = {
        id:         'f' + Date.now() + '_' + Math.floor(Math.random() * 1e4),
        filename,
        batch:      batchId,
        importedAt: new Date().toISOString().slice(0, 10),
        rows,
      };
      return { ...state, students, batches, imports: [entry, ...state.imports] };
    }

    /* Suppression d'un fichier du registre */
    case 'DEL_FILE': {
      const imports = state.imports.filter(f => f.id !== action.id);
      /* Ferme la prévisualisation si le fichier supprimé était affiché */
      const admin = state.admin.fileId === action.id
        ? { ...state.admin, fileId: null }
        : state.admin;
      return { ...state, imports, admin };
    }

    /* Sauvegarde des scores d'un étudiant après édition manuelle */
    case 'UPDATE_STUDENT_SCORES': {
      const stu = state.students[action.id];
      const students = {
        ...state.students,
        [action.id]: { ...stu, courseScores: { ...stu.courseScores, ...action.scores } },
      };
      return { ...state, students };
    }

    default:
      return state;
  }
}


/* ============================================================
   CONTEXTE ET PROVIDER
   ============================================================ */
const AppContext = createContext(null);

/*
  AppProvider : enveloppe toute l'application.
  Fournit : state, dispatch, toast(), toastMsg, go().
*/
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT);

  /* ---- Toast (notification temporaire) ---- */
  const [toastMsg, setToastMsg] = useState('');
  const timerRef = useRef(null); /* Référence au timeout pour pouvoir l'annuler */

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToastMsg(''), 2200);
  }, []);

  /* ---- go() : change de vue et remonte en haut de page ---- */
  const go = useCallback((view) => {
    dispatch({ type: 'GO', view });
    window.scrollTo(0, 0);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, toast, toastMsg, go }}>
      {children}
    </AppContext.Provider>
  );
}

/*
  useApp() : hook à utiliser dans n'importe quel composant pour
  accéder au contexte global (state, dispatch, toast, go).
*/
export function useApp() {
  return useContext(AppContext);
}
