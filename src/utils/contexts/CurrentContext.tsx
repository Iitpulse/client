import { createContext, useEffect, useState, useContext } from "react";

interface ProviderProps {
  children: React.ReactNode;
}

interface CurrentContextType {
  selectedUsers: Array<any>;
  setSelectedUsers: (prev: any) => void;
}

export const CurrentContext = createContext<CurrentContextType>(
  {} as CurrentContextType
);

const CurrentContextProvider: React.FC<ProviderProps> = ({ children }) => {
  const [selectedUsers, setSelectedUsers] = useState<any>([]);

  useEffect(() => {
    // console.log(selectedUsers);
  });
  return (
    <CurrentContext.Provider value={{ selectedUsers, setSelectedUsers }}>
      {children}
    </CurrentContext.Provider>
  );
};

export default CurrentContextProvider;
