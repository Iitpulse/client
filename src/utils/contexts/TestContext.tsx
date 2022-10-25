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
  tests: Array<ITest> | null;
}
export interface recenTestContext {
  highestMarks:Number | string;
  lowestMarks:Number | string;
  averageMarks:Number | string;
  totalAppeared:Number | string;
  name:string;
}

const defaultTestContext: ITestContext = {
  tests: null,
};
const defaultRecentTestContext: recenTestContext = {
   highestMarks: "NA",
  lowestMarks: "NA",
  averageMarks: "NA",
  totalAppeared: "NA",
  name:"NA"
};

export const TestContext = createContext<{
  state: ITestContext;
  dispatch: React.Dispatch<TEST_ACTION>;
  exams: Array<any>;
  subjects: Array<any>;
  recentTest:recenTestContext;
}>({
  state: defaultTestContext,
  dispatch: () => {},
  exams: [],
  subjects: [],
  recentTest:defaultRecentTestContext,
});

const TestsContextProvider: React.FC<ProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(TestReducer, defaultTestContext);
  const [exams, setExams] = useState<any>([]);
  const [recentTest, setRecentTest] = useState<any>(defaultRecentTestContext);
  const [subjects, setsubjects] = useState<any>([]);

  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchTests() {
      const res = await API_TESTS().get(`/test`, {});
      console.log({ res });
      if (res.data?.length > 0) {
        console.log({ res });
        dispatch({
          type: TEST_ACTION_TYPES.SET_TEST,
          payload: {
            tests: res.data,
          },
        });
      }
    }
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
        const recent={
          highestMarks:res.data[0].highestMarks??"NA",
          lowestMarks:res.data[0].lowestMarks??"NA",
          averageMarks:res.data[0].averageMarks??"NA",
          totalAppeared:res.data[0].totalAppeared??"NA",
          name:res.data[0].name,
        }
        setRecentTest(recent);
      }
    }
    fetchTests();
    fetchExams();
    fetchSubjects();
    fetchRecentTest();
  }, [currentUser]);

  return (
    <TestContext.Provider value={{ state, dispatch, exams, subjects,recentTest }}>
      {children}
    </TestContext.Provider>
  );
};

export default TestsContextProvider;
