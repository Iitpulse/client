import { useState, createContext, useEffect } from "react";
import { decodeToken, isExpired } from "react-jwt";
import { AUTH_TOKEN } from "../constants";
import { ICurrentUser, IAuthContext } from "../interfaces";

interface ProviderProps {
  children: React.ReactNode;
}

const defaultAuthContext = {
  currentUser: null,
  roles: {},
  loading: true,
  setRoles: () => {},
  setCurrentUser: () => {},
  setLoading: () => {},
};

export const AuthContext = createContext<IAuthContext>(defaultAuthContext);

const AuthContextProvider = (props: ProviderProps) => {
  const [currentUser, setCurrentUser] = useState<ICurrentUser | null>(null);
  const [roles, setRoles] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const user = localStorage.getItem(AUTH_TOKEN);
    if (user) {
      let decoded = decodeToken(user) as any;
      // console.log({ decoded });
      if (isExpired(user)) {
        localStorage.removeItem(AUTH_TOKEN);
        setCurrentUser(null);
        return;
      }
      let newRoles: any = {};
      decoded?.roles?.forEach((role: any) => {
        newRoles[role.id] = {
          id: role.id,
          permissions: [],
        };
      });
      console.log({ hello: newRoles });
      setCurrentUser({
        email: decoded.email,
        id: decoded.id,
        userType: decoded.userType,
        instituteId: decoded.instituteId,
        roles: newRoles,
      });
    }
  }, []);

  useEffect(() => {
    console.log("THis is User", { currentUser });
  }, [currentUser]);
  useEffect(() => {
    // console.log({ roles });
  }, [roles]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        roles,
        setRoles,
        loading,
        setLoading,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
