import { z } from "zod";

export const subSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string().nonempty("Please fill in Type"),
  totalQuestions: z.number().nullable(),
  toBeAttempted: z.number().nullable(),
  markingScheme: z.object({
    correct: z.array(z.number()).min(1, "Please fill in Marking Scheme"),
    incorrect: z.number(),
  }),
  questions: z.array(z.unknown()), // Replace with the actual schema when you have it
});

export const sectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  exam: z.string(),
  subject: z.string().nonempty("Please fill in Subject"),
  subSections: z.array(subSectionSchema),
  totalQuestions: z.number().nullable(),
  toBeAttempted: z.number().nullable(),
});

export const resultSchema = z.object({
  maxMarks: z.number().nullable(),
  averageMarks: z.number().nullable(),
  averageCompletionTime: z.number().nullable(),
  publishProps: z.object({
    type: z.string(),
    publishDate: z.string().nullable(),
    isPublished: z.boolean(),
    publishedBy: z
      .object({
        userType: z.string(),
        id: z.string(),
        name: z.string(),
      })
      .optional(),
  }),
  students: z.array(
    z.object({
      name: z.string(),
      id: z.string(),
      marks: z.number().nullable(),
    })
  ),
});

export const testSchema = z.object({
  id: z.string(),
  name: z.string().nonempty("Please fill in Name"),
  description: z.string(),
  batches: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .min(1, "Please select at least one Batch"),
  exam: z.object({
    id: z.string().nonempty("Please fill in Exam"),
    name: z.string().nonempty("Please fill in Exam"),
  }),
  status: z
    .enum(["Active", "Inactive", "Ongoing", "Expired"])
    .default("Inactive"),
  validity: z.object({
    from: z.string().nonempty("Please fill in Validity (From)"),
    to: z.string().nonempty("Please fill in Validity (To)"),
  }),
  durationInMinutes: z.number().nullable(),
  sections: z.array(sectionSchema),
  attemptedBy: z
    .object({
      studentsCount: z.number().nullable(),
      locations: z.array(z.string()),
    })
    .optional(),
  result: resultSchema,
  createdBy: z.object({
    userType: z.string(),
    id: z.string(),
  }),
  pattern: z.object({
    name: z.string().nonempty("Please fill in Pattern"),
    id: z.string().nonempty("Please fill in Pattern"),
  }),
  createdAt: z.string().nonempty(),
  modifiedAt: z.string(),
});
