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

export interface ITest {
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
  createdAt: Date;
}

export interface ISubSection {
  id: string; // PT_SS_MCQ123
  name: string;
  description: string; // (optional) this will be used as a placeholder for describing the subsection and will be replaced by the actual description later on
  type: string;
  totalQuestions: number;
  toBeAttempted: number;
  questions: [];
}

export interface ISection {
  id: string; // PT_SE_PHY123
  name: string;
  exam: string;
  subject: string;
  subSections: Array<ISubSection>; // Nesting toBeAttempted
  totalQuestions: number;
  toBeAttempted: number;
}
