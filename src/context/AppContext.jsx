/* ============================================================
   context/AppContext.jsx — État global de l'application
   Architecture : useReducer + Context API
   ============================================================ */

import { createContext, useContext, useReducer, useState, useCallback, useRef } from 'react';
import {
  INITIAL_COURSES, INITIAL_LECTURERS, INITIAL_BATCHES, INITIAL_STUDENTS,
  generateMatric, generateLogin,
} from '../data/index.js';


/* ============================================================
   ÉTAT INITIAL
   ============================================================ */
const INIT = {
  view:      'login',
  role:      null,
  loginRole: 'student',

  student: { id: null, sem: 1, showMine: true, showAvg: false },
  lect:    { batch: null, sem: 1, compare: false, compareYear: 2025, studentId: null, lecturer: null, filter: 'all' },
  admin:   { fileId: null, targetBatch: Object.keys(INITIAL_BATCHES)[0], editSemCi: -1 },

  courses:   INITIAL_COURSES,
  lecturers: INITIAL_LECTURERS,
  batches:   INITIAL_BATCHES,
  students:  INITIAL_STUDENTS,
  imports:   [],
};


/* ============================================================
   REDUCER
   ============================================================ */
function reducer(state, action) {
  switch (action.type) {

    case 'GO':
      return { ...state, view: action.view };

    case 'SET_LOGIN_ROLE':
      return { ...state, loginRole: action.role };

    case 'LOGIN': {
      const { role, studentId, lecturer, batch } = action;
      return {
        ...state,
        role,
        view: role === 'student' ? 'student' : role === 'admin' ? 'admin' : 'lect-batches',
        student: role === 'student' ? { ...state.student, id: studentId, sem: 1 } : state.student,
        lect: (role === 'lecturer' || role === 'admin')
          ? { ...state.lect, lecturer: lecturer ?? state.lect.lecturer, batch: batch ?? state.lect.batch, sem: 1 }
          : state.lect,
      };
    }

    case 'LOGOUT':
      return {
        ...INIT,
        batches:   state.batches,
        students:  state.students,
        lecturers: state.lecturers,
        imports:   state.imports,
        courses:   state.courses,
      };

    case 'SET_STUDENT':
      return { ...state, student: { ...state.student, ...action.patch } };

    case 'SET_LECT':
      return { ...state, lect: { ...state.lect, ...action.patch } };

    case 'SET_ADMIN':
      return { ...state, admin: { ...state.admin, ...action.patch } };

    case 'SET_BATCH_OWNER': {
      const batches = { ...state.batches, [action.batchId]: { ...state.batches[action.batchId], owner: action.lid } };
      return { ...state, batches };
    }

    case 'SAVE_COMMENT': {
      const batches = { ...state.batches, [action.batchId]: { ...state.batches[action.batchId], comment: action.comment } };
      return { ...state, batches };
    }

    case 'SET_COURSE_W': {
      const val = Math.max(0, parseInt(action.val || 0, 10) || 0);
      const courses = state.courses.map((c, i) =>
        i === action.ci ? { ...c, w: c.w.map((v, pi) => pi === action.pi ? val : v) } : c
      );
      return { ...state, courses };
    }

    case 'SET_COURSE_SEM': {
      const sem = Math.max(1, Math.min(8, parseInt(action.val || 1, 10)));
      const courses = state.courses.map((c, i) =>
        i === action.ci ? { ...c, semester: sem } : c
      );
      return { ...state, courses };
    }

    case 'ADD_COURSE': {
      const newCourse = { code: action.code || 'NEW', name: action.name || 'Untitled course', semester: action.sem, w: Array(11).fill(0) };
      return { ...state, courses: [...state.courses, newCourse] };
    }

    case 'DEL_COURSE': {
      const courses = state.courses.filter((_, i) => i !== action.ci);
      return { ...state, courses, admin: { ...state.admin, editSemCi: -1 } };
    }

    /* ---- Import scores CSV (depuis la vue enseignant / admin) ---- */
    case 'IMPORT_FILE': {
      const { filename, batchId, rows } = action;
      let students = { ...state.students };
      const batchStudents = [...state.batches[batchId].students];

      rows.forEach(({ matric, name, course, att }) => {
        const existing = Object.values(students).find(s => s.matric.toUpperCase() === matric.toUpperCase());
        if (existing) {
          students = { ...students, [existing.id]: { ...existing, courseScores: { ...existing.courseScores, [course]: att } } };
        } else {
          const id = 'imp' + Object.keys(students).length;
          students = { ...students, [id]: { id, batch: batchId, matric, name: name || matric, firstName: '', lastName: name || matric, program: '', courseScores: { [course]: att } } };
          batchStudents.push(id);
        }
      });

      const batches = { ...state.batches, [batchId]: { ...state.batches[batchId], students: batchStudents } };
      const entry = { id: 'f' + Date.now() + '_' + Math.floor(Math.random() * 1e4), filename, batch: batchId, importedAt: new Date().toISOString().slice(0, 10), rows };
      return { ...state, students, batches, imports: [entry, ...state.imports] };
    }

    case 'DEL_FILE': {
      const imports = state.imports.filter(f => f.id !== action.id);
      const admin = state.admin.fileId === action.id ? { ...state.admin, fileId: null } : state.admin;
      return { ...state, imports, admin };
    }

    case 'UPDATE_STUDENT_SCORES': {
      const stu = state.students[action.id];
      const students = { ...state.students, [action.id]: { ...stu, courseScores: { ...stu.courseScores, ...action.scores } } };
      return { ...state, students };
    }

    /* ---- Import Excel étudiants (admin) ----
       Colonnes attendues : nom, prenom, batch, programme
       Génère un matricule automatique à partir de la session du batch.
    */
    case 'IMPORT_STUDENTS_EXCEL': {
      let students = { ...state.students };
      let batches  = { ...state.batches };

      action.rows.forEach(({ firstName, lastName, batchId, program }) => {
        /* Ignore les lignes sans nom ou batch invalide */
        if (!firstName && !lastName) return;
        if (!batches[batchId]) return;

        const id     = 'stu_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
        const matric = generateMatric(batchId, batches);
        const name   = `${firstName} ${lastName}`.trim();

        students = {
          ...students,
          [id]: { id, firstName, lastName, name, matric, batch: batchId, program: program || '', courseScores: {} },
        };
        /* Met à jour les étudiants du batch et le compteur pour le prochain matricule */
        batches = { ...batches, [batchId]: { ...batches[batchId], students: [...batches[batchId].students, id] } };
      });

      return { ...state, students, batches };
    }

    /* ---- Import Excel enseignants (admin) ----
       Colonnes attendues : nom, prenom, cours (séparés par "|"), batch
       Génère un login automatique et met à jour l'ownership du batch si précisé.
    */
    case 'IMPORT_LECTURERS_EXCEL': {
      let lecturers = { ...state.lecturers };
      let batches   = { ...state.batches };

      action.rows.forEach(({ firstName, lastName, courses, batchId }) => {
        if (!firstName && !lastName) return;

        const id    = 'lec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
        const login = generateLogin(firstName, lastName);
        const name  = `${firstName} ${lastName}`.trim();

        lecturers = {
          ...lecturers,
          [id]: { id, firstName, lastName, name, login, courses: courses || [], batch: batchId || '' },
        };

        /* Assigne ce lecturer comme responsable du batch s'il est spécifié */
        if (batchId && batches[batchId]) {
          batches = { ...batches, [batchId]: { ...batches[batchId], owner: id } };
        }
      });

      return { ...state, lecturers, batches };
    }

    /* ---- Changement de rôle d'un utilisateur (admin) ----
       student → lecturer : retire de students, ajoute dans lecturers
       lecturer → student : retire de lecturers, ajoute dans students
    */
    case 'SET_USER_ROLE': {
      const { userId, currentRole, newRole } = action;
      if (currentRole === newRole) return state;

      let students  = { ...state.students };
      let lecturers = { ...state.lecturers };
      let batches   = { ...state.batches };

      if (currentRole === 'student' && newRole === 'lecturer') {
        const stu = students[userId];
        if (!stu) return state;

        /* Retrait de la liste étudiants */
        students = Object.fromEntries(Object.entries(students).filter(([k]) => k !== userId));
        /* Retrait de la liste du batch */
        if (batches[stu.batch]) {
          batches = { ...batches, [stu.batch]: { ...batches[stu.batch], students: batches[stu.batch].students.filter(id => id !== userId) } };
        }
        /* Création du compte enseignant */
        const login = generateLogin(stu.firstName || stu.name, stu.lastName || '');
        lecturers = { ...lecturers, [userId]: { id: userId, firstName: stu.firstName || '', lastName: stu.lastName || '', name: stu.name, login, courses: [], batch: stu.batch } };

      } else if (currentRole === 'lecturer' && newRole === 'student') {
        const lec = lecturers[userId];
        if (!lec) return state;

        /* Retrait de la liste enseignants */
        lecturers = Object.fromEntries(Object.entries(lecturers).filter(([k]) => k !== userId));
        /* Si cet enseignant était propriétaire d'un batch, on réassigne au premier enseignant restant */
        const firstLec = Object.keys(lecturers)[0] || '';
        Object.entries(batches).forEach(([bid, b]) => {
          if (b.owner === userId) batches = { ...batches, [bid]: { ...batches[bid], owner: firstLec } };
        });
        /* Création du compte étudiant */
        const batchId = lec.batch || Object.keys(batches)[0];
        const matric  = generateMatric(batchId, batches);
        students = { ...students, [userId]: { id: userId, firstName: lec.firstName || '', lastName: lec.lastName || '', name: lec.name, matric, batch: batchId, program: '', courseScores: {} } };
        if (batches[batchId]) {
          batches = { ...batches, [batchId]: { ...batches[batchId], students: [...batches[batchId].students, userId] } };
        }
      }

      return { ...state, students, lecturers, batches };
    }

    default:
      return state;
  }
}


/* ============================================================
   CONTEXT + PROVIDER
   ============================================================ */
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT);
  const [toastMsg, setToastMsg] = useState('');
  const timerRef = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToastMsg(''), 2200);
  }, []);

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

export function useApp() {
  return useContext(AppContext);
}
