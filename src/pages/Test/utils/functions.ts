import { TTestSchema, TestFormSchemaType, testFormSchema } from "./types";
import { ITest } from "../../../utils/interfaces";
import React from "react";
import { ZodError } from "zod";
import dayjs from "dayjs";
import { testSchema } from "./zodSchemas";

export function getPublishDate(
  publishType: string,
  daysAfter: number | null | undefined,
  testDateRange: Array<any>
): string | null {
  switch (publishType) {
    case "immediately":
      return null;
    case "atTheEndOfTest":
      return dayjs(testDateRange[1]).toISOString();
    case "autoAfterXDays":
      return dayjs()
        .add(daysAfter as number, "day")
        .toISOString();
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
  test: TTestSchema
) => {
  setHelperTexts(defaultState);
  try {
    // This will throw an error if the validation fails
    testSchema.parse(test);
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
