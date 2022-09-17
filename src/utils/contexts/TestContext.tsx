import { createContext, useEffect, useReducer } from "react";
import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITest } from "../interfaces";
import TestReducer from "../reducers/TestReducer";
import axios from "axios";
import { API_TESTS } from "../api";

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
}>({
  state: defaultTestContext,
  dispatch: () => {},
});

const TestsContextProvider: React.FC<ProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(TestReducer, defaultTestContext);

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
    fetchTests();
  }, []);

  return (
    <TestContext.Provider value={{ state, dispatch }}>
      {children}
    </TestContext.Provider>
  );
};

export default TestsContextProvider;
