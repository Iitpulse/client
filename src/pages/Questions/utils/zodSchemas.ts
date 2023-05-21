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
  chapters: z
    .array(
      z.object({
        name: z.string(),
        topics: z.array(z.string()),
      })
    )
    .min(1, "Fill in Chapters"),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
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

const questionSchema = z.object({
  question: z.string().nonempty("Fill in Question"),
  solution: z.string().nonempty("Fill in Solution"),
});

const objectiveQuestionSchema = coreQuestionSchema.extend({
  en: questionSchema.extend({
    options: z.array(optionSchema).min(2, "Fill in Options"),
  }),
  hi: questionSchema.extend({
    options: z.array(optionSchema).min(2, "Fill in Options"),
  }),
  correctAnswers: z
    .array(z.string())
    .min(1, "Fill in Correct Answers")
    .optional(),
});

const integerQuestionSchema = coreQuestionSchema.extend({
  en: questionSchema,
  hi: questionSchema,
  correctAnswers: z.object({
    from: z.number().int(),
    to: z.number().int(),
  }),
});

const paragraphQuestionSchema = coreQuestionSchema.extend({
  questions: z
    .array(objectiveQuestionSchema)
    .min(1, "Please Fill Questions")
    .or(z.array(integerQuestionSchema).min(1, "Please Fill Questions")),
  paragraph: z.string().nonempty("Fill in Paragraph"),
});

const matrixQuestionSchema = coreQuestionSchema.extend({
  en: questionSchema,
  hi: questionSchema,
  correctAnswer: z.array(z.array(z.string())).min(1, "Fill in Correct Answers"),
});

export type TQuestionCore = z.infer<typeof coreQuestionSchema>;
export type TQuestionObjective = z.infer<typeof objectiveQuestionSchema>;
export type TQuestionInteger = z.infer<typeof integerQuestionSchema>;
export type TQuestionParagraph = z.infer<typeof paragraphQuestionSchema>;
export type TQuestionMatrix = z.infer<typeof matrixQuestionSchema>;
