import { z } from "zod";
import { roleSchema } from "./role";
import moment from "moment";

export const userSchema = z.object({
  name: z.string().min(3).max(255),
  email: z.string().email(),
  password: z.string().min(6).max(255),
  //also check if dob should not be greater than or equal to current date
  dob: z
    .string()
    .min(3)
    .max(255)
    .regex(/^\d{2}-\d{2}-\d{4}$/, {
      message: "Invalid date",
    })
    .refine(
      (value) => {
        const currentDate = moment().startOf("day");
        const dobDate = moment(value, "DD-MM-YYYY").startOf("day");
        return dobDate.isBefore(currentDate);
      },
      {
        message: "Date of birth cannot be in future or of today",
      }
    ),
  gender: z.enum(["male", "female", "other"]),
  roles: z.array(
    roleSchema.pick({ id: true }).extend({ from: z.string(), to: z.string() })
  ),
  contact: z
    .number({
      invalid_type_error: "Please enter a valid contact number",
    })
    .min(1000000000, {
      message: "Contact number must be 10 digits long",
    })
    .max(9999999999, {
      message: "Contact number must be 10 digits long",
    }),
  city: z.string().min(3).max(255),
  state: z.string().min(3).max(255),
  address: z.string().min(3).max(255), //Same to update on backend
  institute: z.string().min(3).max(255),
  isEmailVerified: z.boolean(),
  isPhoneVerified: z.boolean(),
  userType: z
    .enum(["student", "teacher", "admin", "superAdmin", "operator", "manager"])
    .refine(
      (value) => {
        return [
          "student",
          "teacher",
          "admin",
          "superAdmin",
          "operator",
          "manager",
        ].includes(value);
      },
      {
        message:
          "Invalid enum value. Expected 'student' | 'teacher' | 'admin' | 'superAdmin' | 'operator' | 'manager'",
      }
    ),
  validity: z.object({
    from: z.string(),
    to: z.string(),
  }),
  createdBy: z.object({
    id: z.string(),
    userType: z.string(),
  }),
  createdAt: z.string(),
  modifiedAt: z.string(),
});

export const studentSchema = userSchema.extend({
  parentDetails: z.object({
    name: z.string().min(3).max(255),
    contact: z
      .number({
        invalid_type_error: "Please enter a valid contact number",
      })
      .min(1000000000, {
        message: "Contact number must be 10 digits long",
      })
      .max(9999999999, {
        message: "Contact number must be 10 digits long",
      }),
  }),
  batch: z.string().min(3).max(255),
  standard: z.number().min(1).max(13, {
    message: "Invalid standard",
  }),
  stream: z.string().min(3).max(255),
  medium: z.string().min(3).max(255),
  school: z.string().min(3).max(255),
  attemptedTests: z.array(z.string()),
});

export const teacherSchema = userSchema.extend({
  subjects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  previousTests: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      exam: z.string(),
      createdAt: z.string(),
    })
  ),
});

export const adminSchema = userSchema;
export const operatorSchema = userSchema;
export const managerSchema = userSchema;
export const superAdminSchema = userSchema.omit({
  validity: true,
});

export type StudentType = z.infer<typeof studentSchema>;
export type TeacherType = z.infer<typeof teacherSchema>;
export type AdminType = z.infer<typeof adminSchema>;
export type OperatorType = z.infer<typeof operatorSchema>;
export type ManagerType = z.infer<typeof managerSchema>;
export type SuperAdminType = z.infer<typeof superAdminSchema>;

export type UserType =
  | StudentType
  | TeacherType
  | AdminType
  | OperatorType
  | ManagerType
  | SuperAdminType;
