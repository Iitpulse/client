import { z } from "zod";
import {
  coreQuestionSchema,
  questionIntegerSchema,
  questionMatrixSchema,
  questionObjectiveSchema,
  questionParagraphSchema,
  questionSchemaEn,
} from "./zodSchemas";

export enum EQuestionType {
  Single = "single",
  Multiple = "multiple",
  Integer = "integer",
  Paragraph = "paragraph",
  Matrix = "matrix",
}

export type TQuestion = z.infer<typeof questionSchemaEn>;
export type TQuestionCore = z.infer<typeof coreQuestionSchema>;
export type TQuestionObjective = z.infer<typeof questionObjectiveSchema>;
export type TQuestionInteger = z.infer<typeof questionIntegerSchema>;
export type TQuestionParagraph = z.infer<typeof questionParagraphSchema>;
export type TQuestionMatrix = z.infer<typeof questionMatrixSchema>;
