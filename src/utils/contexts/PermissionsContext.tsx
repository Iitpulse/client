import axios from "axios";
import { createContext, useEffect, useState, useContext } from "react";
import { API_USERS } from "../api";
import { AuthContext } from "../auth/AuthContext";
import { APIS, PERMISSIONS } from "../constants";

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
  resetPermissions: () => void;
  hasPermissions: any;
}

export const PermissionsContext = createContext<PermissionsContextType>(
  {} as PermissionsContextType
);

const PermissionsContextProvider: React.FC = ({ children }) => {
  const [permissions, setPermissions] = useState<any>({});
  const [allRoles, setAllRoles] = useState<any>([]);

  const [hasPermissions, setHasPermissions] = useState({
    hasQuestionPermission: false,
    hasUsersPermission: false,
    hasTestPermission: false,
    hasPatternPermission: false,
    hasBatchPermission: false,
    hasRolePermission: false,
  });

  const { currentUser, setRoles } = useContext(AuthContext);

  function resetPermissions() {
    setPermissions({});
  }

  useEffect(() => {
    async function getRoles() {
      const response = await API_USERS().get(`/roles/all`);
      setAllRoles(response.data);
      let perms: any = {};
      let hPerms: any = {};
      response.data.forEach((role: any) => {
        perms[role.id] = role.permissions;
        if (currentUser?.roles[role.id]) {
          setRoles((prev: any) => ({
            ...prev,
            [role.id]: {
              id: role.id,
              permissions: role.permissions,
              members: role.members,
            },
          }));
          console.log(role.permissions);
          if (role.permissions.includes(PERMISSIONS.QUESTION.READ)) {
            hPerms = { ...hPerms, hasQuestionPermission: true };
          }
          if (role.permissions.includes(PERMISSIONS.USER.READ)) {
            hPerms = { ...hPerms, hasUsersPermission: true };
          }
          if (role.permissions.includes(PERMISSIONS.TEST.READ)) {
            hPerms = { ...hPerms, hasTestPermission: true };
          }
          if (role.permissions.includes(PERMISSIONS.PATTERN.READ)) {
            hPerms = { ...hPerms, hasPatternPermission: true };
          }
          if (role.permissions.includes(PERMISSIONS.BATCH.READ)) {
            hPerms = { ...hPerms, hasBatchPermission: true };
          }
          if (role.permissions.includes(PERMISSIONS.ROLE.READ)) {
            hPerms = { ...hPerms, hasRolePermission: true };
          }
        }
      });
      setPermissions(perms);
      setHasPermissions(hPerms);
    }
    if (currentUser) {
      getRoles();
    }
  }, [currentUser]);

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        setPermissions,
        allRoles,
        resetPermissions,
        hasPermissions,
      }}
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
