import { z } from "zod";
import { roleSchema } from "./role";
import dayjs from "dayjs";

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
        const currentDate = dayjs().startOf("day");
        const dobDate = dayjs(value, "DD-MM-YYYY").startOf("day");
        return dobDate.isBefore(currentDate);
      },
      {
        message: "Date of birth cannot be in future or of today",
      }
    ),
  gender: z.enum(["male", "female", "other"]),

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
  isEmailVerified: z.boolean().nullish(),
  isPhoneVerified: z.boolean().nullish(),
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
  validity: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .strict(),
  createdBy: z.object({
    id: z.string(),
    userType: z.string(),
  }),
  createdAt: z.string(),
  modifiedAt: z.string(),

  //Fields to be added later
  roles: z.union([
    z.array(
      roleSchema
        .pick({ id: true })
        .extend({ from: z.string(), to: z.string() })
        .strict()
    ),
    z.array(
      roleSchema
        .pick({
          id: true,
          members: true,
          permissions: true,
          name: true,
        })
        .extend({ from: z.string(), to: z.string() })
        .strict()
    ),
  ]), // Since we are using this schema for both create and update, we need to add this union type so that we can use the same schema for both create and update since we are going to use this schema for  create, update functionality and to validate the data we get from backends
});

export const studentSchema = userSchema.extend({
  parentDetails: z
    .object({
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
    })
    .strict(),
  batch: z.string().min(3).max(255).optional(), //Just for now
  standard: z.number().min(1).max(13, {
    message: "Invalid standard",
  }),
  stream: z.string().min(3).max(255),
  medium: z.string().min(3).max(255),
  school: z.string().min(3).max(255),
  attemptedTests: z.array(z.string()),

  //Field to be removed later
  joiningCode: z.string().min(3).max(255),
});

export const teacherSchema = userSchema.extend({
  subjects: z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .strict()
  ),
  previousTests: z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        exam: z.string(),
        createdAt: z.string(),
      })
      .strict()
  ),
});

export const adminSchema = userSchema;
export const operatorSchema = userSchema;
export const managerSchema = userSchema;
export const superAdminSchema = userSchema;
//Whenever we are going to create a superAdmin we need to make sure that we add validity to infinite but need to set it

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
