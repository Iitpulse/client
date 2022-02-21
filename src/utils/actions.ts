export enum TEST_ACTION_TYPES {
  SET_TEST = "SET_TEST",
}

export interface TEST_ACTION {
  type: TEST_ACTION_TYPES;
  payload: any; // index of question
}
