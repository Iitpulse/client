export interface ICurrentUser {
  uid: string;
  email: string;
  userType: string;
}

export interface IAuthContext {
  currentUser: ICurrentUser | null;
}
