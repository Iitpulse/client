import { createContext, useEffect, useState, useContext } from "react";

// interface PermissionContextType {
//   permission: string | undefined;
//   setPermission?: React.Dispatch<React.SetStateAction<string | undefined>>;
// }

interface PermissionType {
  QUESTION: {
    CREATE?: string;
    READ?: string;
    READ_GLOBAL?: string;
    UPDATE?: string;
    DELETE?: string;
  };
  USER: {
    CREATE?: string;
    READ?: string;
    UPDATE?: string;
    DELETE?: string;
  };
  TEST: {
    CREATE?: string;
    READ?: string;
    READ_GLOBAL?: string;
    UPDATE?: string;
    DELETE?: string;
    VIEW_RESULT?: string;
    PUBLISH_RESULT?: string;
    EXPORT_RESULT?: string;
  };
  BATCH: {
    CREATE?: string;
    READ?: string;
    UPDATE?: string;
    DELETE?: string;
  };
  SUBJECT: {
    CREATE?: string;
    READ?: string;
    UPDATE?: string;
    DELETE?: string;
    MANAGE_CHAPTER?: string;
    MANAGE_TOPIC?: string;
  };
  PATTERN: {
    CREATE?: string;
    READ?: string;
    UPDATE?: string;
    DELETE?: string;
  };
}

interface PermissionContextType {
  permission: PermissionType;
}

export const PermissionContext = createContext<PermissionContextType>(
  {} as PermissionContextType
);

const PermissionContextProvider: React.FC = ({ children }) => {
  const [permission, setPermission] = useState<PermissionType>(
    {} as PermissionType
  );

  function getPermission() {
    return {
      QUESTION: {
        CREATE: "CREATE_QUESTION",
        READ: "READ_QUESTION",
        READ_GLOBAL: "READ_GLOBAL_QUESTION",
        UPDATE: "UPDATE_QUESTION",
        DELETE: "DELETE_QUESTION",
      },
      USER: {
        CREATE: "CREATE_USER",
        READ: "READ_USER",
        UPDATE: "UPDATE_USER",
        DELETE: "DELETE_USER",
      },
      TEST: {
        CREATE: "CREATE_TEST",
        READ: "READ_TEST",
        READ_GLOBAL: "READ_GLOBAL_TEST",
        UPDATE: "UPDATE_TEST",
        DELETE: "DELETE_TEST",
        VIEW_RESULT: "VIEW_RESULT",
        PUBLISH_RESULT: "PUBLISH_RESULT",
        EXPORT_RESULT: "EXPORT_RESULT",
      },
      BATCH: {
        CREATE: "CREATE_BATCH",
        READ: "READ_BATCH",
        UPDATE: "UPDATE_BATCH",
        DELETE: "DELETE_BATCH",
      },
      SUBJECT: {
        CREATE: "CREATE_SUBJECT",
        READ: "READ_SUBJECT",
        UPDATE: "UPDATE_SUBJECT",
        DELETE: "DELETE_SUBJECT",
        MANAGE_CHAPTER: "MANAGE_CHAPTER",
        MANAGE_TOPIC: "MANAGE_TOPIC",
      },
      PATTERN: {
        CREATE: "CREATE_PATTERN",
        READ: "READ_PATTERN",
        UPDATE: "UPDATE_PATTERN",
        DELETE: "DELETE_PATTERN",
      },
    };
  }
  useEffect(() => {
    setPermission(getPermission());
  }, []);
  return (
    <PermissionContext.Provider value={{ permission }}>
      {children}
    </PermissionContext.Provider>
  );
};

interface usePermissionProps {
  permission: string;
}

// export const usePermission <usePermissionProps>= ({permission}) => {
//   const permission = useContext(PermissionContext);
// };

export default PermissionContextProvider;
