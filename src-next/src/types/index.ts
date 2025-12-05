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
  roles?: string[];
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

export interface IUserStudent extends IUserBase {
  userType: "student";
  batch?: string;
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
  name: string;
  permissions: Record<string, boolean>;
  members: string[];
  createdAt?: string;
}

export interface IPermissions {
  [key: string]: boolean;
}

// Institute & Batch Types
export interface IInstitute {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt?: string;
}

export interface IBatch {
  _id: string;
  id?: string;
  name: string;
  instituteId: string;
  class?: string;
  year?: string;
  createdAt?: string;
}

// Subject & Chapter Types
export interface ISubject {
  _id: string;
  name: string;
  chapters: IChapter[];
}

export interface IChapter {
  id: string;
  name: string;
  subject: string;
  topics: string[];
}

// Question Types
export type QuestionType = "single" | "multiple" | "integer" | "paragraph" | "matrix";
export type DifficultyLevel = "easy" | "medium" | "hard";

export interface IQuestionBase {
  _id: string;
  type: QuestionType;
  subject: string;
  chapters: Array<{ name: string; topics: string[] }>;
  difficulty: DifficultyLevel;
  sources?: string[];
  exams?: string[];
  isProofRead?: boolean;
  en: {
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
export type TestStatus = "draft" | "scheduled" | "ongoing" | "completed" | "expired";

export interface IMarkingScheme {
  correct: number[];
  incorrect: number;
}

export interface ISubSection {
  id: string;
  name: string;
  type: QuestionType;
  totalQuestions: number;
  toBeAttempted: number;
  markingScheme: IMarkingScheme;
  questions: IQuestion[];
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
  exam?: string;
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
  durationInMinutes: number;
  description?: string;
  sections: ISection[];
  pattern: {
    id: string;
    name: string;
  };
  exam?: {
    id: string;
    name: string;
  };
  batches: Array<{
    id: string;
    name: string;
  }>;
  status: TestStatus;
  validity: {
    from: string;
    to: string;
  };
  totalMarks?: number;
  hideResult?: boolean;
  result?: ITestResult;
  createdBy: {
    userType: string;
    id: string;
    name?: string;
  };
  createdAt: string;
  modifiedAt: string;
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

// Permission Constants
export const PERMISSIONS = {
  QUESTION: {
    CREATE: "question:create",
    READ: "question:read",
    READ_GLOBAL: "question:read_global",
    UPDATE: "question:update",
    DELETE: "question:delete",
  },
  USER: {
    READ: "user:read",
    UPDATE: "user:update",
    DELETE: "user:delete",
  },
  TEST: {
    CREATE: "test:create",
    READ: "test:read",
    READ_GLOBAL: "test:read_global",
    UPDATE: "test:update",
    DELETE: "test:delete",
    VIEW_RESULT: "test:view_result",
    PUBLISH_RESULT: "test:publish_result",
    EXPORT_RESULT: "test:export_result",
  },
  BATCH: {
    CREATE: "batch:create",
    READ: "batch:read",
    UPDATE: "batch:update",
    DELETE: "batch:delete",
  },
  SUBJECT: {
    CREATE: "subject:create",
    READ: "subject:read",
    UPDATE: "subject:update",
    DELETE: "subject:delete",
    MANAGE_CHAPTER: "subject:manage_chapter",
    MANAGE_TOPIC: "subject:manage_topic",
  },
  PATTERN: {
    CREATE: "pattern:create",
    READ: "pattern:read",
    UPDATE: "pattern:update",
    DELETE: "pattern:delete",
  },
  ROLE: {
    CREATE: "role:create",
    READ: "role:read",
    UPDATE: "role:update",
    DELETE: "role:delete",
  },
} as const;
