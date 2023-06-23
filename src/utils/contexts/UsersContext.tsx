import axios from "axios";
import { createContext, useEffect, useState, useContext } from "react";
import { API_USERS } from "../api/config";
import { AuthContext } from "../auth/AuthContext";
import {
  IUserStudent,
  IUserTeacher,
  IUserAdmin,
  IUserOperator,
  IUserManager,
} from "../interfaces";

interface UsersContextType {
  students: Array<IUserStudent>;
  teachers: Array<IUserTeacher>;
  admins: Array<IUserAdmin>;
  operators: Array<IUserOperator>;
  managers: Array<IUserManager>;
  fetchStudents: (cb?: () => void) => void;
  fetchTeachers: (cb?: () => void) => void;
  fetchAdmins: (cb?: () => void) => void;
  fetchOperators: (cb?: () => void) => void;
  fetchManagers: (cb?: () => void) => void;
}

export const UsersContext = createContext<UsersContextType>(
  {} as UsersContextType
);

const UsersContextProvider: React.FC = ({ children }) => {
  const [students, setStudents] = useState<Array<IUserStudent>>([]);
  const [teachers, setTeachers] = useState<Array<IUserTeacher>>([]);
  const [admins, setAdmins] = useState<Array<IUserAdmin>>([]);
  const [operators, setOperators] = useState<Array<IUserOperator>>([]);
  const [managers, setManagers] = useState<Array<IUserManager>>([]);
  const { currentUser } = useContext(AuthContext);

  async function fetchStudents(cb?: () => void) {
    const res = await API_USERS().get(`/student/`);
    setStudents(
      res?.data?.map((user: IUserStudent) => ({ ...user, key: user.id }))
    );
    if (cb) {
      cb();
    }
  }

  async function fetchTeachers(cb?: () => void) {
    const res = await API_USERS().get(`/teacher/`);
    setTeachers(
      res?.data?.map((user: IUserTeacher) => ({ ...user, key: user.id }))
    );
    // console.log({ res });
    if (cb) {
      cb();
    }
  }

  async function fetchAdmins(cb?: () => void) {
    const res = await API_USERS().get(`/admin/`);
    setAdmins(
      res?.data?.map((user: IUserAdmin) => ({ ...user, key: user.id }))
    );
    // console.log({ res });
    if (cb) {
      cb();
    }
  }

  async function fetchOperators(cb?: () => void) {
    const res = await API_USERS().get(`/operator/`);
    setOperators(
      res?.data?.map((user: IUserOperator) => ({ ...user, key: user.id }))
    );
    // console.log({ res });
    if (cb) {
      cb();
    }
  }

  async function fetchManagers(cb?: () => void) {
    const res = await API_USERS().get(`/manager/`);
    setManagers(
      res?.data?.map((user: IUserManager) => ({ ...user, key: user.id }))
    );
    // console.log({ res });
    if (cb) {
      cb();
    }
  }

  useEffect(() => {
    if (currentUser?.id) {
      fetchStudents();
      fetchTeachers();
      fetchAdmins();
      fetchOperators();
      fetchManagers();
    }
  }, [currentUser]);

  return (
    <UsersContext.Provider
      value={{
        students,
        teachers,
        admins,
        operators,
        managers,
        fetchStudents,
        fetchTeachers,
        fetchAdmins,
        fetchOperators,
        fetchManagers,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export default UsersContextProvider;
