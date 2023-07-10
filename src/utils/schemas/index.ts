import { z } from "zod";

export function convertStringToValidationFormat(
  str: string,
  schema: z.ZodType<any, z.ZodTypeDef, any>
): z.ZodType<any, z.ZodTypeDef, any> {
  const keys = str.split("-");
  let currentSchema = schema;

  for (const key of keys) {
    if (currentSchema instanceof z.ZodObject) {
      currentSchema = currentSchema.shape[key];
    } else {
      throw new Error(`Invalid schema type for key: ${key}`);
    }
  }

  return currentSchema;
}

export function convertFieldValue(
  key: string,
  value: any,
  conversionObject: any
) {
  if (conversionObject[key] === null) return value;
  const keys = key.split("-");
  let currentConversionObject = conversionObject;

  for (const nestedKey of keys) {
    if (
      currentConversionObject[nestedKey] &&
      typeof currentConversionObject[nestedKey].convert === "function"
    ) {
      return currentConversionObject[nestedKey].convert(value);
    } else if (typeof currentConversionObject[nestedKey] === "object") {
      currentConversionObject = currentConversionObject[nestedKey];
    } else {
      return value;
    }
  }

  return value;
}

export async function validateField(
  fieldName: any,
  fieldValue: any,
  conversionObject: any,
  studentSchema: any
) {
  try {
    const parsedFieldValue = convertFieldValue(
      fieldName,
      fieldValue,
      conversionObject
    ); // this will convert the value to the required format
    let desiredKey = fieldName;
    const nestedKeys = fieldName.split("-");
    if (nestedKeys.length > 1) {
      desiredKey = nestedKeys[nestedKeys.length - 1];
    }
    const obejctToApplyarseTo = convertStringToValidationFormat(
      fieldName,
      studentSchema
    );
    // console.log({ desiredKey, obejctToApplyarseTo });
    // checkIfTheKeyIsPresentInSchema(desiredKey, obejctToApplyarseTo);// This needs to be done because the schema is not strict
    console.log({ parsedFieldValue });
    obejctToApplyarseTo.parse(parsedFieldValue);
    // console.log("chal gaya");
    return; // Validation successful
  } catch (error: any) {
    console.log({ error });
    const errorMessage = error?.issues?.[0]?.message || error?.message;
    throw errorMessage; // Validation failed
  }
}

export function mapIdWithValues(form: any) {
  const fieldValues: any = {};
  const fieldIds = Object.keys(form.getFieldsValue());

  fieldIds.forEach((id) => {
    fieldValues[id] = form.getFieldValue(id);
  });
  return fieldValues;
}

export function setNestedValue(object: any, key: string, value: any) {
  const keys = key.split("-");
  const lastKey = keys.pop() || "hello";

  let currentObject = object;
  for (const nestedKey of keys) {
    if (!currentObject[nestedKey]) {
      currentObject[nestedKey] = {};
    }
    currentObject = currentObject[nestedKey];
  }

  currentObject[lastKey] = value;
}

export function performZodValidation(
  form: any,
  conversionObject: any,
  studentSchema: any,
  additionalValues: any
) {
  const fieldValues = mapIdWithValues(form); // Get mapped IDs and values from the form
  const convertedValues = {};

  for (const id in fieldValues) {
    // Convert the ID to the desired format
    const value = fieldValues[id];
    const convertedValue = convertFieldValue(id, value, conversionObject);

    setNestedValue(convertedValues, id, convertedValue);
  }
  console.log({ convertedValues });
  const result = studentSchema.parse({
    ...convertedValues,
    ...additionalValues,
  });
  return result;
}
