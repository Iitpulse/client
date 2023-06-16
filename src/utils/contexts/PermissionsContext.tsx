import { createContext, useEffect, useState, useContext } from "react";
import { API_USERS } from "../api/config";
import { AuthContext } from "../auth/AuthContext";
import { APIS, PERMISSIONS } from "../constants";

interface PermissionsContextType {
  loading: boolean;
  permissions: any;
  setPermissions: (permissions: any) => void;
  allRoles: any;
  resetPermissions: () => void;
  hasPermissions: any;
  createNewRole: (name: string) => Promise<any>;
  updateRole: (id: string, name: string) => Promise<any>;
  removeMember: (id: string, member: object) => Promise<any>;
  deleteRole: (id: string) => Promise<any>;
}

export const PermissionsContext = createContext<PermissionsContextType>(
  {} as PermissionsContextType
);

const PermissionsContextProvider: React.FC = ({ children }) => {
  const [permissions, setPermissions] = useState<any>({});
  const [allRoles, setAllRoles] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);
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
      setLoading(true);
      // console.log("LOading On...");
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
      setLoading(false);
    }
    if (currentUser && allRoles?.length === 0) {
      getRoles();
    }
  }, [currentUser]);

  const createNewRole = (name: string): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await API_USERS().post(`/roles/create`, {
          name,
          permissions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: {
            id: currentUser?.id,
            userType: currentUser?.userType,
          },
        });
        setAllRoles((prev: any) => [...prev, res.data]);
        resolve(res.data);
      } catch (error) {
        console.log("ERROR_CREATE_NEW_ROLE", error);
        reject(error);
      }
    });
  };

  const updateRole = (id: string, permissions: any): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await API_USERS().post(`/roles/update`, {
          id,
          permissions,
        });
        setAllRoles((prev: any) =>
          prev.map((role: any) => {
            if (role.id === id) {
              return res.data;
            }
            return role;
          })
        );
        resolve(res.data);
      } catch (error) {
        console.log("ERROR_UPDATE_ROLE", error);
        reject(error);
      }
    });
  };

  const removeMember = (role: string, member: object): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await API_USERS().post(`/roles/removeMember`, {
          member,
          role,
        });
        setAllRoles((prev: any) =>
          prev.map((role: any) => {
            if (role.id === role) {
              return res.data;
            }
            return role;
          })
        );
        resolve(res.data);
      } catch (error) {
        console.log("ERROR_REMOVE_MEMBER", error);
        reject(error);
      }
    });
  };

  const deleteRole = (id: string): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await API_USERS().delete("/roles/deleteRole", {
          data: {
            role: id,
          },
        });
        setAllRoles((prev: any) => prev.filter((role: any) => role.id !== id));
        resolve(res.data);
      } catch (error) {
        console.log("ERROR_DELETE_ROLE", error);
        reject(error);
      }
    });
  };

  return (
    <PermissionsContext.Provider
      value={{
        loading,
        permissions,
        setPermissions,
        allRoles,
        resetPermissions,
        hasPermissions,
        createNewRole,
        updateRole,
        removeMember,
        deleteRole,
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
