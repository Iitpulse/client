import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITest } from "../interfaces";
import TestReducer from "../reducers/TestReducer";
import axios from "axios";
import { API_QUESTIONS, API_TESTS } from "../api";
import { AuthContext } from "../auth/AuthContext";

interface ProviderProps {
  children: React.ReactNode;
}

export interface ITestContext {
  ongoingTests: Array<ITest> | null;
  activeTests: Array<ITest> | null;
  inactiveTests: Array<ITest> | null;
  expiredTests: Array<ITest> | null;
}
export interface recenTestContext {
  highestMarks: Number | string;
  lowestMarks: Number | string;
  averageMarks: Number | string;
  totalAppeared: Number | string;
  name: string;
}

const defaultTestContext: ITestContext = {
  ongoingTests: null,
  activeTests: null,
  inactiveTests: null,
  expiredTests: null,
};
const defaultRecentTestContext: recenTestContext = {
  highestMarks: "NA",
  lowestMarks: "NA",
  averageMarks: "NA",
  totalAppeared: "NA",
  name: "NA",
};

export const TestContext = createContext<{
  state: ITestContext;
  dispatch: React.Dispatch<TEST_ACTION>;
  exams: Array<any>;
  subjects: Array<any>;
  recentTest: recenTestContext;
  fetchTest: (type: "active" | "ongoing" | "inactive" | "expired") => void;
}>({
  state: defaultTestContext,
  dispatch: () => {},
  exams: [],
  subjects: [],
  recentTest: defaultRecentTestContext,
  fetchTest: () => {},
});

function getActionTypeFromTestType(type: string) {
  switch (type) {
    case "ongoing":
      return TEST_ACTION_TYPES.SET_ONGOING_TESTS;
    case "active":
      return TEST_ACTION_TYPES.SET_ACTIVE_TESTS;
    case "inactive":
      return TEST_ACTION_TYPES.SET_INACTIVE_TESTS;
    case "expired":
      return TEST_ACTION_TYPES.SET_EXPIRED_TESTS;
    default:
      return TEST_ACTION_TYPES.SET_ONGOING_TESTS;
  }
}

const TestsContextProvider: React.FC<ProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(TestReducer, defaultTestContext);
  const [exams, setExams] = useState<any>([]);
  const [recentTest, setRecentTest] = useState<any>(defaultRecentTestContext);
  const [subjects, setsubjects] = useState<any>([]);

  const { currentUser } = useContext(AuthContext);

  async function fetchTest(
    type: "active" | "ongoing" | "inactive" | "expired"
  ) {
    const res = await API_TESTS().get(`/test`, {
      params: {
        type,
      },
    });
    console.log({ res });
    if (res.data?.length > 0) {
      console.log({ res });
      dispatch({
        type: getActionTypeFromTestType(type),
        payload: {
          ongoingTests: res.data,
        },
      });
    }
  }

  useEffect(() => {
    async function fetchExams() {
      const res = await API_TESTS().get(`/exam/all`);
      console.log({ res });
      if (res.data?.length > 0) {
        console.log({ res });
        setExams(res.data);
      }
    }
    async function fetchSubjects() {
      const res = await API_QUESTIONS().get(`/subject/subjects`);
      console.log({ res });
      if (res.data?.length > 0) {
        console.log({ res });
        setsubjects(res.data);
      }
    }
    async function fetchRecentTest() {
      const res = await API_TESTS().get(`/test/recent`);
      console.log("recentTests :", { res });
      if (res.data?.length > 0) {
        console.log({ res });
        const recent = {
          highestMarks: res.data[0].highestMarks ?? "NA",
          lowestMarks: res.data[0].lowestMarks ?? "NA",
          averageMarks: res.data[0].averageMarks ?? "NA",
          totalAppeared: res.data[0].totalAppeared ?? "NA",
          name: res.data[0].name,
        };
        setRecentTest(recent);
      }
    }
    fetchTest("ongoing");
    fetchExams();
    fetchSubjects();
    fetchRecentTest();
  }, [currentUser]);

  return (
    <TestContext.Provider
      value={{ state, dispatch, exams, subjects, recentTest, fetchTest }}
    >
      {children}
    </TestContext.Provider>
  );
};

export default TestsContextProvider;
