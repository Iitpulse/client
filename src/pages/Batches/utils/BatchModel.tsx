import { z } from "zod";

export const batchSchema = z.object({
  name: z.string().min(3).max(255),
  exams: z.array(z.string()),
  medium: z.enum(["hindi","english"]),
  institute: z.string().min(3).max(255),
  validity: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .strict(),
  classes: z.array(z.string()),
  createdBy: z.object({
    id: z.string(),
    userType: z.string(),
  }),
  // userType: z.array(z.string()),
  createdAt: z.string(),
  modifiedAt: z.string(),
  roles: z.array(z.string()),
  promoCode: z.array(z.string().length(6))

  //Fields to be added later
  // Since we are using this schema for both create and update, we need to add this union type so that we can use the same schema for both create and update since we are going to use this schema for  create, update functionality and to validate the data we get from backends
});