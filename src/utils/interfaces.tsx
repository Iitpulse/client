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
