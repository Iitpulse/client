// User Types
export type UserType =
  | "admin"
  | "operator"
  | "student"
  | "teacher"
  | "manager"
  | "superAdmin";

export interface ICurrentUser {
  id: string;
  userType: UserType;
  email?: string;
  name?: string;
  instituteId?: string;
  // roles is an object mapping roleId to true, e.g., { "roleId1": true, "roleId2": true }
  roles?: Record<string, boolean>;
}

export interface IUserBase {
  _id: string;
  id?: string;
  name: string;
  email: string;
  contact?: string;
  userType: UserType;
  instituteId?: string;
  createdAt?: string;
  modifiedAt?: string;
}

export interface IStudent extends IUserBase {
  userType: "student";
  batch?: string | IBatch;
  institute?: string | IInstitute;
  class?: string;
  standard?: string;
  school?: string;
  stream?: string;
  medium?: string;
  rollNo?: string;
  phone?: string;
  parentContact?: string;
  parentDetails?: {
    name?: string;
    contact?: string;
  };
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  validity?: {
    from?: string;
    to?: string;
  };
  roles?: Array<string | { _id: string; name: string }>;
}

export interface ITeacher extends IUserBase {
  userType: "teacher";
  subject?: string;
  subjects?: Array<string | { _id: string; name: string }>;
  institute?: string | IInstitute;
  phone?: string;
  qualification?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  validity?: {
    from?: string;
    to?: string;
  };
  roles?: Array<string | { _id: string; name: string }>;
}

export interface IAdmin extends IUserBase {
  userType: "admin";
  institute?: string | IInstitute;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  validity?: {
    from?: string;
    to?: string;
  };
  roles?: Array<string | { _id: string; name: string }>;
}

export interface IOperator extends IUserBase {
  userType: "operator";
  institute?: string | IInstitute;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  validity?: {
    from?: string;
    to?: string;
  };
  roles?: Array<string | { _id: string; name: string }>;
}

export interface IManager extends IUserBase {
  userType: "manager";
  institute?: string | IInstitute;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  validity?: {
    from?: string;
    to?: string;
  };
  roles?: Array<string | { _id: string; name: string }>;
}

// Keep old names as aliases for compatibility
export interface IUserStudent extends IUserBase {
  userType: "student";
  batch?: string | IBatch;
  class?: string;
  rollNo?: string;
  parentContact?: string;
}

export interface IUserTeacher extends IUserBase {
  userType: "teacher";
  subject?: string;
  qualification?: string;
}

export interface IUserAdmin extends IUserBase {
  userType: "admin";
}

export interface IUserOperator extends IUserBase {
  userType: "operator";
}

export interface IUserManager extends IUserBase {
  userType: "manager";
}

// Role & Permission Types
export interface IRole {
  _id: string;
  id?: string;
  name: string;
  // Backend may return permissions as array of strings or object of booleans
  permissions: string[] | Record<string, boolean>;
  // Members can be string IDs or objects with id/userType
  members: (string | { id: string; userType: string })[];
  createdAt?: string;
}

export interface IPermissions {
  [key: string]: boolean;
}

// Institute & Batch Types
export interface IInstitute {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  batches?: string[] | IBatch[];
  students?: string[];
  createdAt?: string;
}

export interface IBatch {
  _id: string;
  id?: string;
  name: string;
  instituteId?: string;
  institute?: string | IInstitute;
  class?: string;
  year?: string;
  students?: string[];
  createdAt?: string;
}

// Subject & Chapter Types
export interface ISubject {
  _id: string;
  name: string;
  chapters: IChapter[];
}

export interface IChapter {
  _id: string;
  id?: string;
  name: string;
  subject?: string;
  topics: string[];
}

// Question Types
export type QuestionType = "single" | "multiple" | "integer" | "paragraph" | "matrix";
export type DifficultyLevel = "easy" | "medium" | "hard";

export interface IQuestionBase {
  _id: string;
  type: QuestionType;
  question: string;
  solution?: string;
  subject: string | { _id: string; name: string };
  chapter?: string | { _id: string; name: string };
  chapters?: Array<{ name: string; topics: string[] }>;
  topics?: string[];
  difficulty: DifficultyLevel;
  sources?: string[];
  exams?: string[];
  isProofRead?: boolean;
  en?: {
    question: string;
    solution?: string;
  };
  hi?: {
    question: string;
    solution?: string;
  };
  createdAt?: string;
  modifiedAt?: string;
  uploadedBy?: {
    userType: string;
    id: string;
  };
}

export interface IQuestionObjective extends IQuestionBase {
  type: "single" | "multiple";
  options: Array<{
    id: string;
    en: { value: string };
    hi?: { value: string };
  }>;
  correctAnswers: string[];
}

export interface IQuestionInteger extends IQuestionBase {
  type: "integer";
  correctAnswer: {
    from: number;
    to: number;
  };
}

export interface IQuestionParagraph extends IQuestionBase {
  type: "paragraph";
  paragraph: {
    en: { value: string };
    hi?: { value: string };
  };
  questions: Array<IQuestionObjective | IQuestionInteger>;
}

export interface IQuestionMatrix extends IQuestionBase {
  type: "matrix";
  correctAnswer: string[][];
}

export type IQuestion =
  | IQuestionObjective
  | IQuestionInteger
  | IQuestionParagraph
  | IQuestionMatrix;

// Test & Pattern Types
export type TestStatus = "active" | "Active" | "ongoing" | "Ongoing" | "inactive" | "Inactive" | "expired" | "Expired" | "draft" | "Draft" | "scheduled" | "Scheduled" | "completed" | "Completed";

export interface IMarkingScheme {
  correct: number[];
  incorrect: number;
}

export interface ISubSection {
  id: string;
  name: string;
  description?: string;
  type: QuestionType;
  paragraphType?: "single" | "multiple" | "integer";
  totalQuestions?: number;
  noOfQuestions?: number;
  toBeAttempted?: number;
  marksPerQuestion?: number;
  markingScheme?: IMarkingScheme;
  questions?: IQuestion[];
}

export interface ISection {
  id: string;
  name: string;
  subject?: string;
  subSections: ISubSection[];
}

export interface IPattern {
  _id: string;
  name: string;
  sections: ISection[];
  exam?: string | { _id: string; name: string };
  durationInMinutes?: number;
  totalMarks?: number;
  createdBy?: {
    userType: string;
    id: string;
  };
  createdAt?: string;
  modifiedAt?: string;
}

export interface ITest {
  _id: string;
  name: string;
  duration?: number;
  durationInMinutes?: number;
  description?: string;
  sections?: ISection[];
  pattern?: string | {
    _id: string;
    id?: string;
    name: string;
  };
  exam?: string | {
    _id: string;
    id?: string;
    name: string;
  };
  batches?: Array<string | IBatch>;
  status: TestStatus;
  validity?: {
    from: string;
    to: string;
  };
  totalMarks?: number;
  hideResult?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  result?: ITestResult;
  createdBy?: {
    userType: string;
    id: string;
    name?: string;
  };
  createdAt?: string;
  modifiedAt?: string;
}

export interface ITestResult {
  highestMarks?: number;
  averageMarks?: number;
  lowestMarks?: number;
  totalAppeared?: number;
  isPublished?: boolean;
  publishedAt?: string;
}

export interface IExam {
  _id: string;
  name: string;
  fullName?: string;
  description?: string;
  isActive?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  totalDocs: number;
  currentPage: number;
  totalPages: number;
}

// Permission Constants - Must match backend format
export const PERMISSIONS = {
  QUESTION: {
    CREATE: "CREATE_QUESTION",
    READ: "READ_QUESTION",
    READ_GLOBAL: "READ_GLOBAL_QUESTION",
    UPDATE: "UPDATE_QUESTION",
    DELETE: "DELETE_QUESTION",
  },
  USER: {
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
    VIEW_RESTRICTED: "tests.view.restricted",
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
} as const;
