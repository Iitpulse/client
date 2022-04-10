export interface ICurrentUser {
  id: string;
  email: string;
  userType: string;
  instituteId: string;
  permissions: { [key: string]: { from: string; to: string } };
}

export interface IAuthContext {
  currentUser: ICurrentUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<ICurrentUser | null>>;
}

export interface ITestTable {
  id: string; //TT_AB123
  name: string;
  description: string;
  exam: {
    id: string;
    name: string;
    fullName: string;
  };
  status: string; // ongoing | active | inactive | expired
  validity: {
    from: string;
    to: string;
  };
  createdBy: {
    userType: string;
    id: string;
  };
  createdAt: string;
}

export interface ITest extends ITestTable {
  sections: ISection[];
  attemptedBy?: {
    studentsCount: number | null;
    locations: Array<string>;
  };
  result?: {
    maxMarks: number | null;
    averageMarks: number | null;
    averageCompletionTime: number | null;
    students: Array<{
      name: string;
      id: string;
      marks: number | null;
    }>;
  };
  modfiedAt?: string;
}

export interface IPattern {
  id: string; // PT_JEE_MAINS
  name: string;
  sections: Array<ISection>;
  exam: string;
  usedIn?: Array<string>;
  createdAt: string;
  modifiedAt: string;
  createdBy: {
    userType: string;
    id: string;
  };
}

export interface ISubSection {
  id: string; // PT_SS_MCQ123
  name: string;
  description: string; // (optional) this will be used as a placeholder for describing the subsection and will be replaced by the actual description later on
  type: string;
  totalQuestions: number | null;
  toBeAttempted: number | null;
  questions: {};
}

export interface ISection {
  id: string; // PT_SE_PHY123
  name: string;
  exam: string;
  subject: string;
  subSections: Array<ISubSection>; // Nesting toBeAttempted
  totalQuestions: number | null;
  toBeAttempted: number | null;
}

export interface IStatus {
  status: string;
  visitedAt: string | null;
  answeredAt: string | null;
  answeredAndMarkedForReviewAt: string | null;
  markedForReviewAt: string | null;
}

export interface IOption {
  id: string;
  value: string;
}

interface IMarkingScheme {
  correct: Array<number>; // index-wise marks (index+1 = no. of correct options)
  incorrect: number; // -1
}

interface IQuestionCore {
  id: string; // Q_AB123
  type: string; // single | multiple | integer | paragraph | matrix
  source: string;
  subject: string;
  chapters: Array<string>;
  topics: Array<string>;
  difficulty: string; // easy | medium | hard
  isProofRead: boolean;
  createdAt: string;
  modifiedAt: string;
  uploadedBy: {
    userType: string; // operator | teacher | admin
    id: string;
  };
}

export interface IQuestionObjective extends IQuestionCore {
  en: {
    question: string;
    solution: string; // QuillJS_HTMLString
    options: Array<IOption>;
  };
  hi: {
    question: string;
    solution: string; // QuillJS_HTMLString
    options: Array<IOption>;
  };
  correctAnswers: Array<string>; // OptionIDs
}

export interface IQuestionInteger extends IQuestionCore {
  en: {
    question: string;
    solution: string; // QuillJS_HTMLString
  };
  hi: {
    question: string;
    solution: string; // QuillJS_HTMLString
  };
  correctAnswers: {
    from: number;
    to: number;
  };
}

export interface IQuestionParagraph extends IQuestionCore {
  questions: Array<IQuestionObjective | IQuestionInteger>;
}

export interface IQuestionMatrix extends IQuestionCore {
  correctAnswers: Array<Array<string>>; // 2D Matrix of OptionIDs
}

// Test Questions

interface ITestQuestionCore {
  id: string; // QT_MCQ123
  markingScheme: IMarkingScheme;
  type: string;
}

export interface ITestQuestionObjective extends ITestQuestionCore {
  en: {
    question: string;
    options: Array<IOption>;
  };
  hi: {
    question: string;
    options: Array<IOption>;
  };
  correctAnswers: Array<string>;
}

export interface ITestQuestionInteger extends ITestQuestionCore {
  en: {
    question: string;
  };
  hi: {
    question: string;
  };
  correctAnswers: {
    from: number;
    to: number;
  };
}

export interface ITestQuestionParagraph extends ITestQuestionCore {
  questions: Array<ITestQuestionObjective | ITestQuestionInteger>;
}

export interface ITestQuestionMatrix extends ITestQuestionCore {
  correctAnswers: Array<Array<string>>; // OptionIDs
}
