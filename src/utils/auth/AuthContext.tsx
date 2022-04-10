import { useState, createContext, useEffect } from "react";
import { decodeToken, isExpired } from "react-jwt";
import { ICurrentUser, IAuthContext } from "../interfaces";

interface ProviderProps {
  children: React.ReactNode;
}

const defaultAuthContext = {
  currentUser: null,
  setCurrentUser: () => {},
};

export const AuthContext = createContext<IAuthContext>(defaultAuthContext);

const AuthContextProvider = (props: ProviderProps) => {
  const [currentUser, setCurrentUser] = useState<ICurrentUser | null>(null);

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
      setCurrentUser({
        email: decoded.email,
        id: decoded.id,
        userType: decoded.userType,
        instituteId: decoded.instituteId,
        permissions: decoded.permissions,
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
