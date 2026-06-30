/* ============================================================
   context/AppContext.jsx — État global de l'application
   Architecture : useReducer + Context API
   ============================================================ */

import { createContext, useContext, useReducer, useState, useCallback, useRef } from 'react';
import {
  INITIAL_COURSES, INITIAL_LECTURERS, INITIAL_BATCHES, INITIAL_STUDENTS,
  PROGRAMS, generateMatric, generateLogin,
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

    /* ---- Import CSV scores ---- */
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


    /* ============================================================
       GESTION DES UTILISATEURS (interface Excel)
    ============================================================ */

    /* Ajoute une nouvelle ligne étudiant vide dans le batch par défaut */
    case 'ADD_USER': {
      const batchId = Object.keys(state.batches)[0] || '';
      const id      = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 4);
      const matric  = generateMatric(batchId, state.batches);
      const newStu  = { id, firstName: '', lastName: '', name: '', matric, batch: batchId, program: PROGRAMS[0] || '', courseScores: {} };
      const students = { ...state.students, [id]: newStu };
      const batches  = batchId
        ? { ...state.batches, [batchId]: { ...state.batches[batchId], students: [...state.batches[batchId].students, id] } }
        : state.batches;
      return { ...state, students, batches };
    }

    /* Met à jour les champs d'un étudiant (inline) */
    case 'UPDATE_STUDENT': {
      const { id, patch } = action;
      const stu = state.students[id];
      if (!stu) return state;

      /* Recalcule le nom complet si prénom ou nom changent */
      const firstName = patch.firstName ?? stu.firstName;
      const lastName  = patch.lastName  ?? stu.lastName;
      const updated   = { ...stu, ...patch, firstName, lastName, name: `${firstName} ${lastName}`.trim() };

      let students = { ...state.students, [id]: updated };
      let batches  = { ...state.batches };

      /* Si le batch change : déplace l'étudiant dans la bonne liste */
      if (patch.batch && patch.batch !== stu.batch) {
        if (batches[stu.batch]) {
          batches = { ...batches, [stu.batch]: { ...batches[stu.batch], students: batches[stu.batch].students.filter(sid => sid !== id) } };
        }
        if (batches[patch.batch]) {
          batches = { ...batches, [patch.batch]: { ...batches[patch.batch], students: [...batches[patch.batch].students, id] } };
        }
      }

      return { ...state, students, batches };
    }

    /* Met à jour les champs d'un enseignant (inline) */
    case 'UPDATE_LECTURER': {
      const { id, patch } = action;
      const lec = state.lecturers[id];
      if (!lec) return state;

      const firstName = patch.firstName ?? lec.firstName;
      const lastName  = patch.lastName  ?? lec.lastName;
      const updated   = { ...lec, ...patch, firstName, lastName, name: `${firstName} ${lastName}`.trim() };

      let lecturers = { ...state.lecturers, [id]: updated };
      let batches   = { ...state.batches };

      /* Si le batch référent change : met à jour l'ownership */
      if (patch.batch && patch.batch !== lec.batch) {
        if (lec.batch && batches[lec.batch]?.owner === id) {
          const fallback = Object.keys(lecturers).find(lid => lid !== id) || '';
          batches = { ...batches, [lec.batch]: { ...batches[lec.batch], owner: fallback } };
        }
        if (batches[patch.batch]) {
          batches = { ...batches, [patch.batch]: { ...batches[patch.batch], owner: id } };
        }
      }

      return { ...state, lecturers, batches };
    }

    /* Supprime un utilisateur (étudiant ou enseignant) */
    case 'DELETE_USER': {
      const { userId, role } = action;
      let students  = { ...state.students };
      let lecturers = { ...state.lecturers };
      let batches   = { ...state.batches };

      if (role === 'student') {
        const stu = students[userId];
        if (!stu) return state;
        students = Object.fromEntries(Object.entries(students).filter(([k]) => k !== userId));
        if (batches[stu.batch]) {
          batches = { ...batches, [stu.batch]: { ...batches[stu.batch], students: batches[stu.batch].students.filter(id => id !== userId) } };
        }
      } else {
        const lec = lecturers[userId];
        if (!lec) return state;
        lecturers = Object.fromEntries(Object.entries(lecturers).filter(([k]) => k !== userId));
        /* Réassigne l'ownership des batches orphelins au premier enseignant restant */
        const firstLec = Object.keys(lecturers)[0] || '';
        Object.entries(batches).forEach(([bid, b]) => {
          if (b.owner === userId) batches = { ...batches, [bid]: { ...batches[bid], owner: firstLec } };
        });
      }

      return { ...state, students, lecturers, batches };
    }

    /* Changement de rôle depuis la liste déroulante */
    case 'SET_USER_ROLE': {
      const { userId, currentRole, newRole } = action;
      if (currentRole === newRole) return state;

      let students  = { ...state.students };
      let lecturers = { ...state.lecturers };
      let batches   = { ...state.batches };

      if (currentRole === 'student' && newRole === 'lecturer') {
        const stu = students[userId];
        if (!stu) return state;
        students = Object.fromEntries(Object.entries(students).filter(([k]) => k !== userId));
        if (batches[stu.batch]) {
          batches = { ...batches, [stu.batch]: { ...batches[stu.batch], students: batches[stu.batch].students.filter(id => id !== userId) } };
        }
        const login = generateLogin(stu.firstName || stu.name, stu.lastName || '');
        lecturers = { ...lecturers, [userId]: { id: userId, firstName: stu.firstName || '', lastName: stu.lastName || '', name: stu.name, login, courses: [], batch: stu.batch } };

      } else if (currentRole === 'lecturer' && newRole === 'student') {
        const lec = lecturers[userId];
        if (!lec) return state;
        lecturers = Object.fromEntries(Object.entries(lecturers).filter(([k]) => k !== userId));
        const firstLec = Object.keys(lecturers)[0] || '';
        Object.entries(batches).forEach(([bid, b]) => {
          if (b.owner === userId) batches = { ...batches, [bid]: { ...batches[bid], owner: firstLec } };
        });
        const batchId = lec.batch || Object.keys(batches)[0];
        const matric  = generateMatric(batchId, batches);
        students = { ...students, [userId]: { id: userId, firstName: lec.firstName || '', lastName: lec.lastName || '', name: lec.name, matric, batch: batchId, program: PROGRAMS[0] || '', courseScores: {} } };
        if (batches[batchId]) {
          batches = { ...batches, [batchId]: { ...batches[batchId], students: [...batches[batchId].students, userId] } };
        }
      }

      return { ...state, students, lecturers, batches };
    }

    /* Import Excel étudiants */
    case 'IMPORT_STUDENTS_EXCEL': {
      let students = { ...state.students };
      let batches  = { ...state.batches };
      action.rows.forEach(({ firstName, lastName, batchId, program }) => {
        if (!firstName && !lastName) return;
        if (!batches[batchId]) return;
        const id     = 'stu_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
        const matric = generateMatric(batchId, batches);
        const name   = `${firstName} ${lastName}`.trim();
        students = { ...students, [id]: { id, firstName, lastName, name, matric, batch: batchId, program: program || '', courseScores: {} } };
        batches  = { ...batches, [batchId]: { ...batches[batchId], students: [...batches[batchId].students, id] } };
      });
      return { ...state, students, batches };
    }

    /* Import Excel enseignants */
    case 'IMPORT_LECTURERS_EXCEL': {
      let lecturers = { ...state.lecturers };
      let batches   = { ...state.batches };
      action.rows.forEach(({ firstName, lastName, courses, batchId }) => {
        if (!firstName && !lastName) return;
        const id    = 'lec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
        const login = generateLogin(firstName, lastName);
        const name  = `${firstName} ${lastName}`.trim();
        lecturers = { ...lecturers, [id]: { id, firstName, lastName, name, login, courses: courses || [], batch: batchId || '' } };
        if (batchId && batches[batchId]) {
          batches = { ...batches, [batchId]: { ...batches[batchId], owner: id } };
        }
      });
      return { ...state, lecturers, batches };
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
