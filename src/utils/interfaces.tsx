export interface ICurrentUser {
  id: string;
  email: string;
  userType: string;
  instituteId: string;
  roles: {
    [key: string]: {
      id: string;
      permissions: string[];
    };
  };
}
export interface IUserDetails {
  _id: string;
  email: string;
  userType: string;
  institute: string;
  batch: string;
  roles: {
    [key: string]: {
      id: string;
      permissions: string[];
    };
  };
}

export interface IAuthContext {
  currentUser: ICurrentUser | null;
  userDetails: IUserDetails | null;
  roles: {
    [key: string]: {
      id: string;
      permissions: string[];
    };
  };
  loading: boolean;
  setRoles: (roles: any) => void;
  setCurrentUser: React.Dispatch<React.SetStateAction<ICurrentUser | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  userExists: () => boolean;
}

export interface ITestTable {
  id: string; //TT_AB123
  name: string;
  description: string;
  batches: Array<{
    id: string;
    name: string;
  }>;
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
  durationInMinutes: number | null;
  sections: ISection[];
  attemptedBy?: {
    studentsCount: number | null;
    locations: Array<string>;
  };
  result: {
    maxMarks: number | null;
    averageMarks: number | null;
    averageCompletionTime: number | null;
    publishProps: {
      type: string;
      publishDate: string | null;
      isPublished: boolean;
      publishedBy: {
        userType: string;
        id: string;
        name: string;
      };
    };
    students: Array<{
      name: string;
      id: string;
      marks: number | null;
    }>;
  };
  modfiedAt?: string;
}

export interface IPattern {
  _id: string; // PT_JEE_MAINS
  name: string;
  durationInMinutes: number;
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
  paragraphType: string;
  totalQuestions: number | null;
  toBeAttempted: number | null;
  markingScheme: {
    correct: Array<number>;
    incorrect: number;
  };

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
  sources: Array<string>;
  subject: string;
  chapters: Array<{
    name: string;
    topics: Array<string>;
  }>;

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
  correctAnswer: {
    from: number;
    to: number;
  };
}

export interface IQuestionParagraph extends IQuestionCore {
  questions: Array<IQuestionObjective | IQuestionInteger>;
  paragraph: string; // QuillJS_HTMLString
}

export interface IQuestionMatrix extends IQuestionCore {
  correctAnswer: Array<Array<string>>; // 2D Matrix of OptionIDs
  en: {
    question: string;
    solution: string; // QuillJS_HTMLString
  };
  hi: {
    question: string;
    solution: string; // QuillJS_HTMLString
  };
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

/* Users */
export interface IUserStudent {
  id: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  contact: number;
  address: string;
  parentDetails: { name: string; contact: number };
  school: string;
  batch: string;
  stream: string;
  institute: string;
  userType: string;
  validity: {
    from: string;
    to: string;
  };
  roles: [
    {
      id: string;
      from: string;
      to: string;
    }
  ];
  attemptedTests: [];
  createdBy: { id: string; userType: string };
  createdAt: string;
  modifiedAt: string;
}

export interface IUserTeacher {
  id: string;
  name: string;
  email: string;
  password: string;
  contact: number;
  address: string;
  gender: string;
  parentDetails: { name: string; contact: number };
  institute: string;
  userType: string;
  validity: {
    from: string;
    to: string;
  };
  roles: [
    {
      id: string;
      from: string;
      to: string;
    }
  ];
  previousTests: [];
  createdBy: { id: string; userType: string };
  createdAt: string;
  modifiedAt: string;
}

export interface IUserAdmin {
  id: string; // INSTITUTE_ID_AD_ABCDEF123
  name: string;
  email: string;
  password: string;
  contact: number;
  institute: string;
  gender: string;
  validity: {
    from: string;
    to: string;
  };
  userType: string;
  createdAt: string;
  modifiedAt: string;
  createdBy: {
    userType: string;
    id: string;
  };
  roles: [
    {
      id: String;
      from: String;
      to: String;
    }
  ];
}

export interface IUserOperator {
  id: string;
  name: string;
  email: string;
  password: string;
  contact: number;
  address: string;
  institute: string;
  gender: string;
  userType: string;
  validity: {
    from: string;
    to: string;
  };
  roles: [
    {
      id: string;
      from: string;
      to: string;
    }
  ];
  createdBy: string;
  createdAt: string;
  modifiedAt: string;
}

export interface IUserManager {
  id: string;
  name: string;
  email: string;
  password: string;
  contact: number;
  institute: string;
  gender: string;
  validity: {
    from: string;
    to: string;
  };
  userType: string;
  roles: [
    {
      id: string;
      from: string;
      to: string;
    }
  ];
  createdBy: string;
  createdAt: string;
  modifiedAt: string;
}
