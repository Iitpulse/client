import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITestContext } from "../contexts/TestContext";
import { ITest } from "../interfaces";

export default function TestReducer(
  state: ITestContext,
  action: TEST_ACTION
): ITestContext {
  const { type, payload } = action;

  switch (type) {
    case TEST_ACTION_TYPES.SET_ONGOING_TESTS:
      return {
        ...state,
        ongoingTests: payload?.map((test: any) => ({
          ...test,
          id: test._id,
        })),
      };
    case TEST_ACTION_TYPES.SET_ACTIVE_TESTS:
      return {
        ...state,
        activeTests: payload?.map((test: any) => ({
          ...test,
          id: test._id,
        })),
      };
    case TEST_ACTION_TYPES.SET_INACTIVE_TESTS:
      return {
        ...state,
        inactiveTests: payload?.map((test: any) => ({
          ...test,
          id: test._id,
        })),
      };
    case TEST_ACTION_TYPES.SET_EXPIRED_TESTS:
      return {
        ...state,
        expiredTests: payload?.map((test: any) => ({
          ...test,
          id: test._id,
        })),
      };
    default:
      return state;
  }
}
