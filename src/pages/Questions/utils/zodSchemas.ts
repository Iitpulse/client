import { z } from "zod";

const optionSchema = z.object({
  id: z.string().nonempty(),
  value: z.string().nonempty(),
});

export const coreQuestionSchema = z.object({
  id: z.string().nonempty("Fill in ID"),
  type: z.enum(["single", "multiple", "integer", "paragraph", "matrix"]),
  sources: z.array(z.string()),
  subject: z.string().nonempty("Fill in Subject"),
  exams: z.array(z.string()).min(1, "Select Exam(s)"),
  chapters: z
    .array(
      z.object({
        name: z.string(),
        topics: z.array(z.string()),
      })
    )
    .min(1, "Fill in Chapters"),
  difficulty: z.enum(["Easy", "Medium", "Hard", "unset"]).default("unset"),
  isProofRead: z.boolean().default(false),
  createdAt: z
    .string()
    .refine(
      (value) => !isNaN(Date.parse(value)),
      "Must be a valid ISO date string"
    ),
  modifiedAt: z
    .string()
    .refine(
      (value) => !isNaN(Date.parse(value)),
      "Must be a valid ISO date string"
    ),
  uploadedBy: z.object({
    userType: z.enum(["operator", "teacher", "admin"]),
    id: z.string(),
  }),
});

export const questionSchemaEn = z.object({
  question: z.string().nonempty("Fill in Question"),
  solution: z.string().nonempty("Fill in Solution").optional().default(""),
});

export const questionSchemaHi = z.object({
  question: z.string().optional().default(""),
  solution: z.string().optional().default(""),
});

export const questionObjectiveSchema = coreQuestionSchema.extend({
  en: questionSchemaEn.extend({
    options: z.array(optionSchema).min(2, "Fill in Options"),
  }),
  hi: questionSchemaHi.extend({
    options: z
      .array(optionSchema.extend({ value: z.string().optional().default("") }))
      .min(2, "Fill in Options")
      .optional()
      .default([]),
  }),
  correctAnswers: z
    .array(z.string())
    .min(1, "Fill in Correct Answers")
    .optional(),
});

export const questionIntegerSchema = coreQuestionSchema.extend({
  en: questionSchemaEn,
  hi: questionSchemaHi,
  correctAnswer: z.object({
    from: z.number().int("Fill in CorrectAnswer (From)"),
    to: z.number().int("Fill in CorrectAnswer (To)"),
  }),
});

export const questionParagraphSchema = coreQuestionSchema.extend({
  questions: z
    .array(
      z.union([
        questionObjectiveSchema.omit({
          uploadedBy: true,
          createdAt: true,
          modifiedAt: true,
          sources: true,
          exams: true,
          isProofRead: true,
          chapters: true,
          difficulty: true,
          subject: true,
        }),
        questionIntegerSchema.omit({
          uploadedBy: true,
          createdAt: true,
          modifiedAt: true,
          sources: true,
          exams: true,
          isProofRead: true,
          chapters: true,
          difficulty: true,
          subject: true,
        }),
      ])
    )
    .min(1, "Fill in Questions"),
  paragraph: z.string().nonempty("Fill in Paragraph"),
});

export const questionMatrixSchema = coreQuestionSchema.extend({
  en: questionSchemaEn,
  hi: questionSchemaHi,
  correctAnswer: z.array(z.array(z.string())).min(1, "Fill in Correct Answers"),
});
