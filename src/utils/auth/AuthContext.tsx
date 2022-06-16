import { useState, createContext, useEffect } from "react";
import { decodeToken, isExpired } from "react-jwt";
import { ICurrentUser, IAuthContext } from "../interfaces";

interface ProviderProps {
  children: React.ReactNode;
}

const defaultAuthContext = {
  currentUser: null,
  roles: {},
  setRoles: () => {},
  setCurrentUser: () => {},
};

export const AuthContext = createContext<IAuthContext>(defaultAuthContext);

const AuthContextProvider = (props: ProviderProps) => {
  const [currentUser, setCurrentUser] = useState<ICurrentUser | null>(null);
  const [roles, setRoles] = useState<any>({});

  useEffect(() => {
    const user = localStorage.getItem("token");
    if (user) {
      let decoded = decodeToken(user) as any;
      console.log({ decoded });
      if (isExpired(user)) {
        localStorage.removeItem("token");
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
    console.log({ roles });
  }, [roles]);

  return (
    <AuthContext.Provider
      value={{ currentUser, setCurrentUser, roles, setRoles }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
