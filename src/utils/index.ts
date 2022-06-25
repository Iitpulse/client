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
