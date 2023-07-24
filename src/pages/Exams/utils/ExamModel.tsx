import { string, z } from "zod";

export const ExamSchema = z.object({
  name: z.string().min(3).max(255),
  fullName: z.string().min(3).max(255),
  subjects: z.array(z.string()),
  //Fields to be added later
  // Since we are using this schema for both create and update, we need to add this union type so that we can use the same schema for both create and update since we are going to use this schema for  create, update functionality and to validate the data we get from backends
});
