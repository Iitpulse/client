import { z } from "zod";

export const testFormSchema = z.object({
  test: z.object({
    name: z.string().nonempty("Fill in Name"),
    description: z.string().nonempty("Fill Description"),
    exam: z.object({
      id: z.string().nonempty("Select Exam"),
    }),
  }),
  batches: z.array(z.any()).nonempty("Fill Batches"),
  status: z.object({
    name: z.string().nonempty("Select Status"),
  }),
  testDateRange: z.array(z.date()).min(2, "Select valid dates"),
  pattern: z.object({
    name: z.string().nonempty("Select Pattern"),
  }),
});

export type TestFormSchemaType = z.infer<typeof testFormSchema>;
