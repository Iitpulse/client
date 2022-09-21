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
import { API_TESTS } from "../api";
import { AuthContext } from "../auth/AuthContext";

interface ProviderProps {
  children: React.ReactNode;
}

export interface ITestContext {
  tests: Array<ITest> | null;
}

const defaultTestContext: ITestContext = {
  tests: null,
};

export const TestContext = createContext<{
  state: ITestContext;
  dispatch: React.Dispatch<TEST_ACTION>;
  exams: Array<any>;
}>({
  state: defaultTestContext,
  dispatch: () => {},
  exams: [],
});

const TestsContextProvider: React.FC<ProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(TestReducer, defaultTestContext);
  const [exams, setExams] = useState<any>([]);

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
            test: res.data,
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
    fetchTests();
    fetchExams();
  }, [currentUser]);

  return (
    <TestContext.Provider value={{ state, dispatch, exams }}>
      {children}
    </TestContext.Provider>
  );
};

export default TestsContextProvider;
