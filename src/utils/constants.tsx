export const USER_TYPES = {
  ADMIN: "admin",
  OPERATOR: "operator",
  STUDENT: "student",
  TEACHER: "teacher",
  GUEST_ADMIN: "guest-admin",
  GUEST_OPERATOR: "guest-operator",
  GUEST_STUDENT: "guest-student",
  GUEST_TEACHER: "guest-teacher",
};

export const EXAMS = {};

export const top100Films = [
  { title: "The Shawshank Redemption", year: 1994 },
  { title: "The Godfather", year: 1972 },
  { title: "The Godfather: Part II", year: 1974 },
  { title: "The Dark Knight", year: 2008 },
  { title: "12 Angry Men", year: 1957 },
  { title: "Schindler's List", year: 1993 },
  { title: "Pulp Fiction", year: 1994 },
  {
    title: "The Lord of the Rings: The Return of the King",
    year: 2003,
  },
  { title: "The Good, the Bad and the Ugly", year: 1966 },
  { title: "Fight Club", year: 1999 },
  {
    title: "The Lord of the Rings: The Fellowship of the Ring",
    year: 2001,
  },
  {
    title: "Star Wars: Episode V - The Empire Strikes Back",
    year: 1980,
  },
  { title: "Forrest Gump", year: 1994 },
  { title: "Inception", year: 2010 },
];

export const SAMPLE_TEST = {
  id: "",
  name: "",
  description: "",
  sections: [],
  exam: {
    id: "",
    name: "",
    fullName: "",
  },
  status: "",
  validity: {
    from: "",
    to: "",
  },
  attemptedBy: {
    studentsCount: null,
    locations: [],
  },
  result: {
    maxMarks: null,
    averageMarks: null,
    averageCompletionTime: null,
    students: [],
  },
  createdBy: {
    id: "",
    name: "",
    userType: "",
  },
  createdAt: "",
  modifiedAt: "",
};

export const PERMISSIONS = {
  QUESTION: {
    CREATE: "CREATE_QUESTION",
    READ: "READ_QUESTION",
    READ_GLOBAL: "READ_GLOBAL_QUESTION",
    UPDATE: "UPDATE_QUESTION",
    DELETE: "DELETE_QUESTION",
  },
  USER: {
    CREATE: "CREATE_USER",
    READ: "READ_USER",
    UPDATE: "UPDATE_USER",
    DELETE: "DELETE_USER",
  },
  TEST: {
    CREATE: "CREATE_TEST",
    READ: "READ_TEST",
    READ_GLOBAL: "READ_GLOBAL_TEST",
    UPDATE: "UPDATE_TEST",
    DELETE: "DELETE_TEST",
    VIEW_RESULT: "VIEW_RESULT",
    PUBLISH_RESULT: "PUBLISH_RESULT",
    EXPORT_RESULT: "EXPORT_RESULT",
  },
  BATCH: {
    CREATE: "CREATE_BATCH",
    READ: "READ_BATCH",
    UPDATE: "UPDATE_BATCH",
    DELETE: "DELETE_BATCH",
  },
  SUBJECT: {
    CREATE: "CREATE_SUBJECT",
    READ: "READ_SUBJECT",
    UPDATE: "UPDATE_SUBJECT",
    DELETE: "DELETE_SUBJECT",
    MANAGE_CHAPTER: "MANAGE_CHAPTER",
    MANAGE_TOPIC: "MANAGE_TOPIC",
  },
  PATTERN: {
    CREATE: "CREATE_PATTERN",
    READ: "READ_PATTERN",
    UPDATE: "UPDATE_PATTERN",
    DELETE: "DELETE_PATTERN",
  },
  ROLE: {
    CREATE: "CREATE_ROLE",
    READ: "READ_ROLE",
    UPDATE: "UPDATE_ROLE",
    DELETE: "DELETE_ROLE",
  },
};

// export const SAMPLE_TEST = {
//   id: "IITP_AB123",
//   name: "Sample Test",
//   description: "Sample Test Description",
//   sections: [
//     {
//       id: "PT_SE_",
//       name: "Section",
//       exam: "JEE Mains",
//       subject: "Physics",
//       totalQuestions: 40,
//       toBeAttempted: 30,
//       subSections: [
//         {
//           id: "PT_SS_MCQ123",
//           name: "MCQ",
//           description: "Sample MCQ",
//           type: "single",
//           totalQuestions: 40,
//           toBeAttempted: 30,
//           questions: {},
//         },
//       ],
//     },
//   ],
//   exam: {
//     id: "JEEMAINS",
//     name: "JEE_MAINS",
//     fullName: "JOINT ENTRANCE EXAMINATION MAINS",
//   },
//   status: "ongoing",
//   validity: {
//     from: new Date("2022-01-01").toISOString(),
//     to: new Date("2023-12-31").toISOString(),
//   },
//   attemptedBy: {
//     studentsCount: 10,
//     locations: ["Bangalore", "Mumbai"],
//   },
//   result: {
//     maxMarks: 1,
//     averageMarks: 0.5,
//     averageCompletionTime: 30,
//     students: [
//       {
//         name: "John",
//         id: "ST_AB123",
//         marks: 1,
//       },
//       {
//         name: "Jane",
//         id: "ST_AB124",
//         marks: 1,
//       },
//       {
//         name: "Jack",
//         id: "ST_AB125",
//         marks: 1,
//       },
//       {
//         name: "Jill",
//         id: "ST_AB126",
//         marks: 1,
//       },
//     ],
//   },
//   createdBy: {
//     id: "IITP_TR_AB123",
//     name: "John",
//     userType: USER_TYPES.TEACHER,
//   },
//   createdAt: new Date().toISOString(),
//   modifiedAt: new Date().toISOString(),
// };
