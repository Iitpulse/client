export interface ICurrentUser {
  id: string;
  email: string;
  userType: string;
  instituteId: string;
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
    name: string;
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
