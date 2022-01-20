export interface ICurrentUser {
  uid: string;
  email: string;
}

export interface IAuthContext {
  currentUser: ICurrentUser | null;
}
