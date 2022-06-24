import axios from "axios";
import { createContext, useEffect, useState, useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import { IUserStudent, IUserTeacher, IUserAdmin } from "../interfaces";

interface UsersContextType {
  students: Array<IUserStudent>;
  teachers: Array<IUserTeacher>;
  admins: Array<IUserAdmin>;
  fetchStudents: (cb?: () => void) => void;
  fetchTeachers: (cb?: () => void) => void;
  fetchAdmins: (cb?: () => void) => void;
}

export const UsersContext = createContext<UsersContextType>(
  {} as UsersContextType
);

const UsersContextProvider: React.FC = ({ children }) => {
  const [students, setStudents] = useState<Array<IUserStudent>>([]);
  const [teachers, setTeachers] = useState<Array<IUserTeacher>>([]);
  const [admins, setAdmins] = useState<Array<IUserAdmin>>([]);
  const [operator, setOperator] = useState<Array<IUserTeacher>>([]);
  const { currentUser } = useContext(AuthContext);

  async function fetchStudents(cb?: () => void) {
    const res = await axios.get(`${process.env.REACT_APP_USERS_API}/student/`);
    setStudents(
      res?.data?.map((user: IUserStudent) => ({ ...user, key: user.id }))
    );
    if (cb) {
      cb();
    }
  }

  async function fetchTeachers(cb?: () => void) {
    const res = await axios.get(`${process.env.REACT_APP_USERS_API}/teacher/`);
    setTeachers(
      res?.data?.map((user: IUserTeacher) => ({ ...user, key: user.id }))
    );
    console.log({ res });
    if (cb) {
      cb();
    }
  }

  async function fetchAdmins(cb?: () => void) {
    const res = await axios.get(`${process.env.REACT_APP_USERS_API}/admin/`);
    setAdmins(
      res?.data?.map((user: IUserAdmin) => ({ ...user, key: user.id }))
    );
    console.log({ res });
    if (cb) {
      cb();
    }
  }

  useEffect(() => {
    if (currentUser?.id) {
      fetchStudents();
      fetchTeachers();
      fetchAdmins();
    }
  }, [currentUser]);

  return (
    <UsersContext.Provider
      value={{
        students,
        teachers,
        admins,
        fetchStudents,
        fetchTeachers,
        fetchAdmins,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export default UsersContextProvider;
