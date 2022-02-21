import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITestContext } from "../contexts/TestContext";
import { ITest } from "../interfaces";

export default function TestReducer(
  state: ITestContext,
  action: TEST_ACTION
): ITestContext {
  const { tests } = state;
  const { type, payload } = action;

  switch (type) {
    case TEST_ACTION_TYPES.SET_TEST:
      return {
        ...state,
        tests: payload.test.map((test: ITest) => ({
          id: test.id,
          name: test.name,
        })),
      };
    default:
      return state;
  }
}
