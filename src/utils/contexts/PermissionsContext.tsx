import { createContext, useEffect, useState, useContext } from "react";
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
}

export const PermissionsContext = createContext<PermissionsContextType>(
  {} as PermissionsContextType
);

const PermissionsContextProvider: React.FC = ({ children }) => {
  const [permissions, setPermissions] = useState<any>({});

  function getPermissions() {
    return {
      READ_QUESTION: {
        from: "Date",
        to: "Date",
      },
      CREATE_QUESTION: {
        from: "Date",
        to: "Date",
      },
      UPDATE_QUESTION: {
        from: "Date",
        to: "Date",
      },
      READ_GLOBAL_QUESTION: {
        from: "Date",
        to: "Date",
      },
      DELETE_QUESTION: {
        from: "Date",
        to: "Date",
      },
      READ_USER: {
        from: "Date",
        to: "Date",
      },
      CREATE_USER: {
        from: "Date",
        to: "Date",
      },
      UPDATE_USER: {
        from: "Date",
        to: "Date",
      },
      DELETE_USER: {
        from: "Date",
        to: "Date",
      },

      READ_BATCH: {
        from: "Date",
        to: "Date",
      },
      CREATE_BATCH: {
        from: "Date",
        to: "Date",
      },
      UPDATE_BATCH: {
        from: "Date",
        to: "Date",
      },
      DELETE_BATCH: {
        from: "Date",
        to: "Date",
      },

      READ_PATTERN: {
        from: "Date",
        to: "Date",
      },
      CREATE_PATTERN: {
        from: "Date",
        to: "Date",
      },
      UPDATE_PATTERN: {
        from: "Date",
        to: "Date",
      },
      DELETE_PATTERN: {
        from: "Date",
        to: "Date",
      },
      READ_SUBJECT: {
        from: "Date",
        to: "Date",
      },
      CREATE_SUBJECT: {
        from: "Date",
        to: "Date",
      },
      UPDATE_SUBJECT: {
        from: "Date",
        to: "Date",
      },
      DELETE_SUBJECT: {
        from: "Date",
        to: "Date",
      },
      MANAGE_CHAPTER: {
        from: "Date",
        to: "Date",
      },
      MANAGE_TOPIC: {
        from: "Date",
        to: "Date",
      },
      READ_TEST: {
        from: "Date",
        to: "Date",
      },
      READ_GLOBAL_TEST: {
        from: "Date",
        to: "Date",
      },
      VIEW_RESULT: {
        from: "Date",
        to: "Date",
      },
      PUBLISH_RESULT: {
        from: "Date",
        to: "Date",
      },
      EXPORT_RESULT: {
        from: "Date",
        to: "Date",
      },
      CREATE_TEST: {
        from: "Date",
        to: "Date",
      },
      UPDATE_TEST: {
        from: "Date",
        to: "Date",
      },
      DELETE_TEST: {
        from: "Date",
        to: "Date",
      },
      READ_ROLE: {
        from: "Date",
        to: "Date",
      },
      CREATE_ROLE: {
        from: "Date",
        to: "Date",
      },
      UPDATE_ROLE: {
        from: "Date",
        to: "Date",
      },
      DELETE_ROLE: {
        from: "Date",
        to: "Date",
      },
    };
  }

  useEffect(() => {
    // setPermissions(flattendPermissions());
  }, []);

  return (
    <PermissionsContext.Provider value={{ permissions, setPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermission = (permission: string) => {
  const { permissions } = useContext(PermissionsContext);
  return Object.keys(permissions).includes(permission);
};

export default PermissionsContextProvider;

const permissionssssss = ["create_questions", "update_questions"];

const flattendPermissions = () => {
  let final: any = [];
  console.log({ per: Object.keys(PERMISSIONS) });
  Object.keys(PERMISSIONS).forEach((item) => {
    // @ts-ignores
    final = [...final, ...Object.values(PERMISSIONS[item])];
  });
  console.log({ final });
  return final;
};
