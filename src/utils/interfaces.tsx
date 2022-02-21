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
  name: string;
  id: string;
}
