import { PERMISSIONS } from "./constants";
import { IUserStudent } from "./interfaces";

export { result } from "./data";

export function flattenUserDataForCSV(data: any) {
  return data.map((item: any) => {
    let newItem: any = {
      ...item,
      createdBy: item.createdBy?.id,
      roles: item.roles?.map((role: any) => role.id)?.join(", "),
      createdAt: new Date(item.createdAt).toLocaleDateString(),
      modifiedAt: new Date(item.modifiedAt).toLocaleDateString(),
    };

    delete newItem.key;
    delete newItem.password;
    return newItem;
  });
}

export function flattenUserStudents(students: Array<IUserStudent>): Array<any> {
  return students.map((student: IUserStudent) => {
    let newStudent: any = {
      ...student,
      createdBy: student.createdBy?.id,
      attemptedTests: student.attemptedTests?.join(", "),
      parentName: student.parentDetails.name,
      parentContact: student.parentDetails.contact,
      roles: student.roles?.map((role: any) => role.id)?.join(", "),
      validFrom: new Date(student.validity.from).toLocaleDateString(),
      validTill: new Date(student.validity.to).toLocaleDateString(),
      createdAt: new Date(student.createdAt).toLocaleDateString(),
      modifiedAt: new Date(student.modifiedAt).toLocaleDateString(),
    };

    delete newStudent.key;
    delete newStudent.password;
    delete newStudent.validity;
    delete newStudent.confirmPassword;
    delete newStudent.parentDetails;
    return newStudent;
  });
}

export function splitAndKeepDelimiters(
  str: any,
  separator: any,
  method = "seperate"
) {
  function splitAndKeep(strValue: string, sep: any, method = "seperate") {
    return strValue.split(sep).reduce(
      (acc, cur) => {
        acc.parts.push(cur);
        acc.separators.push(sep);
        return acc;
      },
      { parts: [], separators: [] } as { parts: string[]; separators: string[] }
    );
  }

  if (!Array.isArray(separator))
    return splitAndKeep(str, separator, method).parts;

  let parts = splitAndKeep(str, separator[0], method).parts;
  parts = separator.slice(1).reduce((acc, sep) => {
    return acc
      .map((part: string) => splitAndKeep(part, sep, method).parts)
      .flat();
  }, parts);

  return parts;
}

export function stringToCamelCase(str: string) {
  return str
    .split(" ")
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export const flattendPermissions = () => {
  let final: any = [];
  Object.keys(PERMISSIONS).forEach((item) => {
    // @ts-ignores
    final = [...final, ...Object.values(PERMISSIONS[item])];
  });
  return final;
};

export function roundToOne(num: number) {
  return Number(num).toFixed(1);
}

export function capitalizeFirstLetter(str: string) {
  return str?.charAt(0)?.toUpperCase() + str?.slice(1);
}
