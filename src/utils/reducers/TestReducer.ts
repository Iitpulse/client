import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITestContext } from "../contexts/TestContext";

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
        tests: payload.test.map((test: any) => ({
          id: test._id,
          name: test.name,
          description: test.description,
          exam: test.exam,
          status: test.status,
          validity: test.validity,
          createdBy: test.createdBy,
          createdAt: test.createdAt,
        })),
      };
    default:
      return state;
  }
}
