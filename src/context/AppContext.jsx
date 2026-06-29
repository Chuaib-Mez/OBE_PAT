import { createContext, useContext, useReducer, useState, useCallback, useRef } from 'react';
import {
  INITIAL_COURSES, INITIAL_LECTURERS, INITIAL_BATCHES, INITIAL_STUDENTS,
} from '../data/index.js';

const INIT = {
  view: 'login',
  role: null,
  loginRole: 'student',
  student: { id: null, sem: 1, showMine: true, showAvg: false },
  lect: { batch: null, sem: 1, compare: false, compareYear: 2025, studentId: null, lecturer: null, filter: 'all' },
  admin: { fileId: null, targetBatch: Object.keys(INITIAL_BATCHES)[0], editSemCi: -1 },
  courses: INITIAL_COURSES,
  lecturers: INITIAL_LECTURERS,
  batches: INITIAL_BATCHES,
  students: INITIAL_STUDENTS,
  imports: [],
};

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
        batches: state.batches,
        students: state.students,
        imports: state.imports,
        courses: state.courses,
      };

    case 'SET_STUDENT':
      return { ...state, student: { ...state.student, ...action.patch } };

    case 'SET_LECT':
      return { ...state, lect: { ...state.lect, ...action.patch } };

    case 'SET_ADMIN':
      return { ...state, admin: { ...state.admin, ...action.patch } };

    case 'SET_BATCH_OWNER': {
      const batches = {
        ...state.batches,
        [action.batchId]: { ...state.batches[action.batchId], owner: action.lid },
      };
      return { ...state, batches };
    }

    case 'SAVE_COMMENT': {
      const batches = {
        ...state.batches,
        [action.batchId]: { ...state.batches[action.batchId], comment: action.comment },
      };
      return { ...state, batches };
    }

    case 'SET_COURSE_W': {
      const val = Math.max(0, parseInt(action.val || 0, 10) || 0);
      const courses = state.courses.map((c, i) =>
        i === action.ci
          ? { ...c, w: c.w.map((v, pi) => pi === action.pi ? val : v) }
          : c
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
      const newCourse = {
        code: action.code || 'NEW',
        name: action.name || 'Untitled course',
        semester: action.sem,
        w: Array(11).fill(0),
      };
      return { ...state, courses: [...state.courses, newCourse] };
    }

    case 'DEL_COURSE': {
      const courses = state.courses.filter((_, i) => i !== action.ci);
      return { ...state, courses, admin: { ...state.admin, editSemCi: -1 } };
    }

    case 'IMPORT_FILE': {
      const { filename, batchId, rows } = action;
      let students = { ...state.students };
      const batchStudents = [...state.batches[batchId].students];

      rows.forEach(({ matric, name, course, att }) => {
        const existing = Object.values(students).find(
          s => s.matric.toUpperCase() === matric.toUpperCase()
        );
        if (existing) {
          students = {
            ...students,
            [existing.id]: {
              ...existing,
              courseScores: { ...existing.courseScores, [course]: att },
            },
          };
        } else {
          const id = 'imp' + Object.keys(students).length;
          students = {
            ...students,
            [id]: { id, batch: batchId, matric, name: name || matric, courseScores: { [course]: att } },
          };
          batchStudents.push(id);
        }
      });

      const batches = {
        ...state.batches,
        [batchId]: { ...state.batches[batchId], students: batchStudents },
      };
      const entry = {
        id: 'f' + Date.now() + '_' + Math.floor(Math.random() * 1e4),
        filename,
        batch: batchId,
        importedAt: new Date().toISOString().slice(0, 10),
        rows,
      };
      return { ...state, students, batches, imports: [entry, ...state.imports] };
    }

    case 'DEL_FILE': {
      const imports = state.imports.filter(f => f.id !== action.id);
      const admin = state.admin.fileId === action.id
        ? { ...state.admin, fileId: null }
        : state.admin;
      return { ...state, imports, admin };
    }

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
