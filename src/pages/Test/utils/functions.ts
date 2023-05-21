import moment from "moment";
import { TestFormSchemaType, testFormSchema } from "./types";
import { ITest } from "../../../utils/interfaces";
import React from "react";
import { ZodError } from "zod";

export function getPublishDate(
  publishType: string,
  daysAfter: number | null | undefined,
  testDateRange: Array<any>
): string | null {
  switch (publishType) {
    case "immediately":
      return null;
    case "atTheEndOfTest":
      return moment(testDateRange[1]).toISOString();
    case "autoAfterXDays":
      return moment().add(daysAfter, "days").toISOString();
    case "manual":
      return null;
    default:
      return null;
  }
}

// Validate
export const isTestFormFilled = (
  setHelperTexts: React.Dispatch<React.SetStateAction<any>>,
  defaultState: TestFormSchemaType,
  data: {
    test: ITest;
    batches: Array<any>;
    status: any;
    testDateRange: Array<any>;
    pattern: any;
  }
) => {
  setHelperTexts(defaultState);
  const { test, batches, status, testDateRange, pattern } = data;
  try {
    // This will throw an error if the validation fails
    testFormSchema.parse({
      test: test,
      batches: batches,
      status: status,
      testDateRange: testDateRange,
      pattern: pattern,
    });

    // If the above line didn't throw, validation passed
    return true;
  } catch (error) {
    if (error instanceof ZodError) {
      error.errors.forEach((issue) => {
        let path = issue.path.join(".");
        let message = issue.message;
        setHelperTexts((prevState: any) => ({
          ...prevState,
          [path]: message,
        }));
      });
    } else {
      console.error(error);
    }
    return false;
  }
};
