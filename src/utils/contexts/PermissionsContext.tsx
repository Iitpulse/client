import axios from "axios";
import { createContext, useEffect, useState, useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import { PERMISSIONS } from "../constants";

interface PermissionsType {
  READ_QUESTION?: {
    from: string;
    to: string;
  };
  CREATE_QUESTION?: {
    from: string;
    to: string;
  };
  UPDATE_QUESTION?: {
    from: string;
    to: string;
  };
  READ_GLOBAL_QUESTION?: {
    from: string;
    to: string;
  };
  DELETE_QUESTION?: {
    from: string;
    to: string;
  };
  READ_USER?: {
    from: string;
    to: string;
  };
  CREATE_USER?: {
    from: string;
    to: string;
  };
  UPDATE_USER?: {
    from: string;
    to: string;
  };
  DELETE_USER?: {
    from: string;
    to: string;
  };

  READ_BATCH?: {
    from: string;
    to: string;
  };
  CREATE_BATCH?: {
    from: string;
    to: string;
  };
  UPDATE_BATCH?: {
    from: string;
    to: string;
  };
  DELETE_BATCH?: {
    from: string;
    to: string;
  };

  READ_PATTERN?: {
    from: string;
    to: string;
  };
  CREATE_PATTERN?: {
    from: string;
    to: string;
  };
  UPDATE_PATTERN?: {
    from: string;
    to: string;
  };
  DELETE_PATTERN?: {
    from: string;
    to: string;
  };
  READ_SUBJECT?: {
    from: string;
    to: string;
  };
  CREATE_SUBJECT?: {
    from: string;
    to: string;
  };
  UPDATE_SUBJECT?: {
    from: string;
    to: string;
  };
  DELETE_SUBJECT?: {
    from: string;
    to: string;
  };
  MANAGE_CHAPTER?: {
    from: string;
    to: string;
  };
  MANAGE_TOPIC?: {
    from: string;
    to: string;
  };
  READ_TEST?: {
    from: string;
    to: string;
  };
  READ_GLOBAL_TEST?: {
    from: string;
    to: string;
  };
  VIEW_RESULT?: {
    from: string;
    to: string;
  };
  PUBLISH_RESULT?: {
    from: string;
    to: string;
  };
  EXPORT_RESULT?: {
    from: string;
    to: string;
  };
  CREATE_TEST?: {
    from: string;
    to: string;
  };
  UPDATE_TEST?: {
    from: string;
    to: string;
  };
  DELETE_TEST?: {
    from: string;
    to: string;
  };
  READ_ROLE?: {
    from: string;
    to: string;
  };
  CREATE_ROLE?: {
    from: string;
    to: string;
  };
  UPDATE_ROLE?: {
    from: string;
    to: string;
  };
  DELETE_ROLE?: {
    from: string;
    to: string;
  };
}

interface PermissionsContextType {
  permissions: any;
  setPermissions: (permissions: any) => void;
  allRoles: any;
}

export const PermissionsContext = createContext<PermissionsContextType>(
  {} as PermissionsContextType
);

const PermissionsContextProvider: React.FC = ({ children }) => {
  const [permissions, setPermissions] = useState<any>({});
  const [allRoles, setAllRoles] = useState<any>([]);

  const { currentUser, setRoles } = useContext(AuthContext);

  useEffect(() => {
    async function getRoles() {
      const response = await axios.get("http://localhost:5000/roles/all");
      setAllRoles(response.data);
      let perms: any = {};
      response.data.forEach((role: any) => {
        console.log({ role });
        perms[role.id] = role.permissions;
        if (currentUser?.roles[role.id]) {
          setRoles((prev: any) => ({
            ...prev,
            [role.id]: { id: role.id, permissions: role.permissions },
          }));
        }
      });
      setPermissions(perms);
    }
    if (currentUser) {
      getRoles();
    }
  }, [currentUser]);

  return (
    <PermissionsContext.Provider
      value={{ permissions, setPermissions, allRoles }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermission = (permission: string) => {
  const { roles } = useContext(AuthContext);
  let hasPermission = false;
  if (roles) {
    let allValues = Object.values(roles);
    hasPermission =
      allValues.findIndex((item: any) =>
        item.permissions?.includes(permission)
      ) !== -1;
  }
  return hasPermission;
};

export default PermissionsContextProvider;
