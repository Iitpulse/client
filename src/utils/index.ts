import { IUserStudent } from "./interfaces";

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
    return strValue
      .split(sep)
      .reduce((acc, cur) => {
        return [...acc, cur, sep];
      }, [] as string[])
      .slice(0, -1);
  }

  if (Array.isArray(separator)) {
    let parts = splitAndKeep(str, separator[0], method);
    for (let i = 1; i < separator.length; i++) {
      let partsTemp = parts;
      parts = [];
      for (let p = 0; p < partsTemp.length; p++) {
        parts = parts.concat(splitAndKeep(partsTemp[p], separator[i], method));
      }
    }
    return parts;
  } else {
    return splitAndKeep(str, separator, method);
  }
}

export function stringToCamelCase(str: string) {
  return str
    .split(" ")
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}
