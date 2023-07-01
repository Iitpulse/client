import { z } from "zod";

export const PatternFormSchema = z.object({
  name: z.string().nonempty("Fill in Name"),
  exam: z.string().nonempty("Fill in Exam"),
  durationInMinutes: z.string().nonempty("Fill in Duration"),
  sections: z.array(
    z.object({
      id: z.string().nonempty("Fill in section Id"),
      name: z.string().nonempty("Fill in section Name"),
      exam: z.string().nonempty("Fill in Exam"),
      subject: z.string().nonempty("Fill in section Subject"),
      subSections: z.array(
        z.object({
          id: z.string().nonempty("Fill in subsection Id"),
          name: z.string().nonempty("Fill in subsection Name"),
          description: z.string().nonempty("Fill in subsection Description"),
          type: z.string().nonempty("Fill in subsection Type"),
          totalQuestions: z.number(),
          toBeAttempted: z.number(),
          markingScheme: z.object({
            correct: z.array(z.number()),
            incorrect: z.number(),
          }),
        })
      ),
      totalQuestions: z.number(),
      toBeAttempted: z.number(),
    })
  ),
});

export type PatternFormSchemaType = z.infer<typeof PatternFormSchema>;
