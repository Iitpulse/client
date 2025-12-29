import { z } from "zod";

// Helper function to strip HTML tags
const stripHtml = (html: string): string => {
  if (typeof window === "undefined") {
    // Server-side: use regex to strip HTML
    return html.replace(/<[^>]*>/g, "").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

// Custom validation for non-empty HTML content
const nonEmptyHtml = z.string().refine(
  (value) => {
    const strippedValue = stripHtml(value).trim();
    return strippedValue.length > 0;
  },
  { message: "Field cannot be empty" }
);

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
  question: nonEmptyHtml,
  solution: z.string().optional().default(""),
});

export const questionSchemaHi = z.object({
  question: z.string().optional().default(""),
  options: z
    .array(
      z.object({
        id: z.string(),
        value: z.string().optional().default(""),
      })
    )
    .default([]),
});

export const questionObjectiveSchema = coreQuestionSchema.extend({
  en: questionSchemaEn.extend({
    options: z.array(optionSchema).min(4, "Fill in at least 4 options"),
  }),
  hi: questionSchemaHi,
  correctAnswers: z.array(z.string()).min(1, "Select at least one correct answer"),
});

export const questionIntegerSchema = coreQuestionSchema.extend({
  en: questionSchemaEn,
  hi: questionSchemaHi,
  correctAnswer: z.object({
    from: z.number({ required_error: "Fill in From value" }),
    to: z.number({ required_error: "Fill in To value" }),
  }),
});

export const questionParagraphSchema = coreQuestionSchema.extend({
  questions: z.array(z.unknown()).min(1, "Add at least one question"),
  paragraph: z.object({
    en: z.object({ value: nonEmptyHtml }),
    hi: z.object({ value: z.string().optional().default("") }),
  }),
});

export const questionMatrixSchema = coreQuestionSchema.extend({
  en: questionSchemaEn,
  hi: questionSchemaHi,
  correctAnswer: z.array(z.array(z.boolean())).min(1, "Fill in Correct Answers"),
});

// Error types
export interface FormErrors {
  type?: string;
  subject?: string;
  chapters?: string;
  topics?: string;
  exams?: string;
  sources?: string;
  difficulty?: string;
  uploadedBy?: string;
  en?: {
    question?: string;
    solution?: string;
    options?: string;
  };
  hi?: {
    question?: string;
    options?: string;
  };
  correctAnswers?: string;
  correctAnswer?: string;
  paragraph?: string;
  questions?: string;
  [key: string]: unknown;
}

// Parse Zod errors into a more usable format
export function parseZodErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join(".");

    // Handle nested paths
    if (path.startsWith("en.")) {
      if (!errors.en) errors.en = {};
      const field = path.replace("en.", "") as keyof typeof errors.en;
      (errors.en as Record<string, string>)[field] = issue.message;
    } else if (path.startsWith("hi.")) {
      if (!errors.hi) errors.hi = {};
      const field = path.replace("hi.", "") as keyof typeof errors.hi;
      (errors.hi as Record<string, string>)[field] = issue.message;
    } else {
      (errors as Record<string, string>)[path] = issue.message;
    }
  });

  return errors;
}

// Generate question core data
export interface QuestionCoreInput {
  id?: string;
  type: "single" | "multiple" | "integer" | "paragraph" | "matrix";
  subject: string;
  chapters: Array<{ name: string; topics?: string[] }>;
  topics: string[];
  difficulty: string;
  exams: string[];
  sources: string[];
  isProofRead: boolean;
}

export interface UploadedBy {
  userType: "operator" | "teacher" | "admin";
  id: string;
}

export function generateQuestionCore(
  input: QuestionCoreInput,
  uploadedBy: UploadedBy
) {
  const {
    id,
    type,
    subject,
    chapters,
    topics,
    difficulty,
    exams,
    sources,
    isProofRead,
  } = input;

  return {
    id: id || Date.now().toString(),
    type,
    subject,
    chapters: chapters.map((chapter) => ({
      name: chapter.name,
      topics: topics.length
        ? (chapter.topics || []).filter((topic) => topics.includes(topic))
        : [],
    })),
    difficulty: difficulty || "unset",
    exams,
    sources,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    isProofRead,
    uploadedBy,
  };
}

// Option interface
export interface QuestionOption {
  id: string;
  value: string;
  isCorrectAnswer?: boolean;
}

// Generate objective question
export function generateObjectiveQuestion(
  questionCore: ReturnType<typeof generateQuestionCore>,
  data: {
    en: { question: string; options: QuestionOption[]; solution: string };
    hi: { question: string; options: QuestionOption[]; solution: string };
    type: "single" | "multiple";
  }
) {
  return {
    ...questionCore,
    type: data.type,
    en: {
      question: data.en.question,
      options: data.en.options.map((opt) => ({
        id: opt.id,
        value: opt.value,
      })),
      solution: data.en.solution,
    },
    hi: {
      question: data.hi.question,
      options: data.hi.options.map((opt) => ({
        id: opt.id,
        value: opt.value,
      })),
      solution: data.hi.solution,
    },
    correctAnswers: data.en.options
      .filter((opt) => opt.isCorrectAnswer)
      .map((opt) => opt.id),
  };
}

// Generate integer question
export function generateIntegerQuestion(
  questionCore: ReturnType<typeof generateQuestionCore>,
  data: {
    en: { question: string; solution: string };
    hi: { question: string; solution: string };
    correctAnswer: { from: number; to: number };
  }
) {
  return {
    ...questionCore,
    en: {
      question: data.en.question,
      solution: data.en.solution,
    },
    hi: {
      question: data.hi.question,
      solution: data.hi.solution,
    },
    correctAnswer: data.correctAnswer,
  };
}

// Generate paragraph question
export function generateParagraphQuestion(
  questionCore: ReturnType<typeof generateQuestionCore>,
  data: {
    paragraph: { en: string; hi: string };
    questions: unknown[];
  }
) {
  return {
    ...questionCore,
    paragraph: {
      en: { value: data.paragraph.en },
      hi: { value: data.paragraph.hi },
    },
    questions: data.questions,
  };
}

// Generate matrix question
export function generateMatrixQuestion(
  questionCore: ReturnType<typeof generateQuestionCore>,
  data: {
    en: { question: string; options: { id: string; value: string }[]; solution: string };
    hi: { question: string; options: { id: string; value: string }[]; solution: string };
    correctAnswer: boolean[][];
  }
) {
  return {
    ...questionCore,
    en: {
      question: data.en.question,
      options: data.en.options,
      solution: data.en.solution,
    },
    hi: {
      question: data.hi.question,
      options: data.hi.options,
      solution: data.hi.solution,
    },
    options: data.en.options,
    correctAnswer: data.correctAnswer,
  };
}
