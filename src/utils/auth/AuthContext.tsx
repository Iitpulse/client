import { useState, createContext, useEffect } from "react";
import { decodeToken, isExpired } from "react-jwt";
import { useNavigate } from "react-router";
import { API_USERS } from "../api/config";
import { AUTH_TOKEN } from "../constants";
import { ICurrentUser, IAuthContext, IUserDetails } from "../interfaces";

interface ProviderProps {
  children: React.ReactNode;
}

const defaultAuthContext = {
  currentUser: null,
  userDetails: null,
  roles: {},
  loading: true,
  setRoles: () => {},
  setCurrentUser: () => {},
  setLoading: () => {},
  userExists: () => false,
};

export const AuthContext = createContext<IAuthContext>(defaultAuthContext);

const AuthContextProvider = (props: ProviderProps) => {
  const [currentUser, setCurrentUser] = useState<ICurrentUser | null>(null);
  const [userDetails, setuserDetails] = useState<IUserDetails | null>(null);
  const [roles, setRoles] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem(AUTH_TOKEN);
    async function getUserDetails(id: string, userType: string) {
      // console.log(id);
      const res = await API_USERS().get(`/${userType}/single`, {
        params: { id },
      });
      console.log({ id, res });
      setuserDetails(res.data);
    }
    if (user) {
      let decoded = decodeToken(user) as any;
      // console.log({ decoded });
      if (isExpired(user)) {
        localStorage.removeItem(AUTH_TOKEN);
        setCurrentUser(null);
        navigate("/login");
        return;
      }
      let newRoles: any = {};
      decoded?.roles?.forEach((role: any) => {
        newRoles[role.id] = {
          id: role.id,
          permissions: [],
        };
      });
      // console.log({ hello: newRoles });
      // console.log({ decoded });
      setCurrentUser({
        email: decoded.email,
        id: decoded.id,
        userType: decoded.userType,
        instituteId: decoded.instituteId,
        roles: newRoles,
      });

      getUserDetails(decoded.id, decoded.userType);
    }
  }, [navigate]);

  useEffect(() => {
    // console.log("THis is User", { currentUser });
  }, [currentUser]);
  useEffect(() => {
    // console.log({ roles });
  }, [roles]);

  function userExists() {
    return currentUser !== null;
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userDetails,
        setCurrentUser,
        roles,
        setRoles,
        loading,
        setLoading,
        userExists,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
