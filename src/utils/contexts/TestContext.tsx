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
import { API_QUESTIONS, API_TESTS } from "../api/config";
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
const defaultRecentTestContext: recenTestContext[] = [
  {
    highestMarks: "NA",
    lowestMarks: "NA",
    averageMarks: "NA",
    totalAppeared: "NA",
    name: "NA",
  },
];

export const TestContext = createContext<{
  state: ITestContext;
  dispatch: React.Dispatch<TEST_ACTION>;
  exams: Array<any>;
  subjects: Array<any>;
  chapters: Array<any>;
  recentTest: recenTestContext[];
  fetchTest: (
    type: "active" | "ongoing" | "inactive" | "expired",
    excludeAttempted?: boolean,
    cb?: (error: any, data: any[]) => void
  ) => void;
  fetchTestByID: (testId: string) => Promise<any>;
}>({
  state: defaultTestContext,
  dispatch: () => {},
  exams: [],
  subjects: [],
  recentTest: defaultRecentTestContext,
  fetchTest: () => {},
  fetchTestByID: async () => {},
  chapters: [],
});

function getActionTypeFromTestType(status: string) {
  switch (status.toLowerCase()) {
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
  const [chapters, setChapters] = useState<any>([]);
  const [topics, setTopics] = useState<any>([]);
  const { currentUser, userDetails } = useContext(AuthContext);
  // console.log(currentUser, userDetails);
  async function fetchTest(
    status: "active" | "ongoing" | "inactive" | "expired",
    excludeAttempted: boolean = false,
    cb?: (error: any, data: any[]) => void
  ) {
    try {
      let batch = "";
      if (currentUser?.userType === "student" && userDetails?.batch)
        batch = userDetails?.batch;
      // console.log(batch, currentUser?.userType, userDetails);
      const res = await API_TESTS().get(`/test`, {
        params: {
          status,
          batch,
          excludeAttempted,
        },
      });
      if (cb) cb(null, res.data);
      // console.log({ res });

      dispatch({
        type: getActionTypeFromTestType(status),
        payload: res.data,
      });
    } catch (err) {
      console.log(err);
      if (cb) cb(err, []);
    }
  }

  async function fetchTestByID(testId: string) {
    try {
      return API_TESTS().get(`/test/${testId}`);
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  useEffect(() => {
    async function fetchExams() {
      const res = await API_TESTS().get(`/exam/all`);
      // console.log({ res });
      if (res.data?.length > 0) {
        // console.log({ res });
        setExams(res.data);
      }
    }
    async function fetchSubjects() {
      const res = await API_QUESTIONS().get(`/subject/subjects`);
      // console.log({ res });
      if (res.data?.length > 0) {
        // console.log({ res });
        setsubjects(res.data);
      }
    }
    async function fetchChapters() {
      const res = await API_QUESTIONS().get(`/subject/chapter`);
      // console.log({ res });
      if (res.data?.length > 0) {
        // console.log({ res });
        setChapters(res.data);
      }
    }
    async function fetchTopics() {
      const res = await API_QUESTIONS().get(`/subject/topic/all`);
      // console.log({ res });
      if (res.data?.length > 0) {
        // console.log({ res });
        setTopics(res.data);
      }
    }
    async function fetchRecentTest() {
      const res = await API_TESTS().get(`/test/recent`, {
        params: {
          count: 5,
        },
      });
      console.log("recentTests :", { res });
      if (res.data?.length > 0) {
        // console.log({ res });
        const recent = res.data;
        // console.log(recent);
        // console.log({ recent });
        setRecentTest(recent);
      }
    }
    if (userDetails) {
      fetchTest("ongoing", true);
    }
    fetchExams();
    fetchSubjects();
    fetchChapters();
    fetchRecentTest();
    fetchTopics();
  }, [currentUser, userDetails]);

  return (
    <TestContext.Provider
      value={{
        state,
        dispatch,
        exams,
        subjects,
        recentTest,
        fetchTest,
        fetchTestByID,
        chapters,
      }}
    >
      {children}
    </TestContext.Provider>
  );
};

export default TestsContextProvider;

export const useTestContext = () => useContext(TestContext);
