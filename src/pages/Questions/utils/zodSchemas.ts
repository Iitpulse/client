import { z } from "zod";

// Helper function to strip HTML tags
const stripHtml = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

// Custom validation for non-empty HTML content
const nonEmptyHtml = z.string().refine((value) => {
  const strippedValue = stripHtml(value).trim();
  return strippedValue.length > 0;
}, "Field cannot be empty");

const optionSchema = z.object({
  id: z.string(),
  value: nonEmptyHtml, // Ensure non-empty value after stripping HTML
});

export const coreQuestionSchema = z.object({
  id: z.string().min(1, "Fill in ID"),
  type: z.enum(["single", "multiple", "integer", "paragraph", "matrix"]),
  sources: z.array(z.string()),
  subject: z.string().min(1, "Fill in Subject"),
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
    id: z.string().min(1, "Fill in ID"),
  }),
});

export const questionSchemaEn = z.object({
  question: nonEmptyHtml, // Use custom validation for non-empty HTML content
  solution: nonEmptyHtml.optional().default(""), // Use custom validation for non-empty HTML content
});

export const questionSchemaHi = z.object({
  question: nonEmptyHtml, // Use custom validation for non-empty HTML content
  options: z.array(optionSchema).min(2, "Fill in Options").default([]), // At least 2 options with non-empty values
});

export const questionObjectiveSchema = coreQuestionSchema.extend({
  en: questionSchemaEn.extend({
    options: z.array(optionSchema).min(4, "Fill in Options"), // At least 4 options with non-empty values
  }),
  hi: questionSchemaHi.extend({
    options: z
      .array(optionSchema.extend({ value: z.string().optional().default("") }))
      .min(2, "Fill in Options")
      .default([]),
  }),
  correctAnswers: z.array(z.string()).min(1, "Fill in Correct Answers"),
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
  paragraph: nonEmptyHtml, // Use custom validation for non-empty HTML content
});

export const questionMatrixSchema = coreQuestionSchema.extend({
  en: questionSchemaEn,
  hi: questionSchemaHi,
  correctAnswer: z.array(z.array(z.string())).min(1, "Fill in Correct Answers"),
});
