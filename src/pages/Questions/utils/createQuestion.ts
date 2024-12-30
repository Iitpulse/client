import { ICurrentUser } from "../../../utils/interfaces";
import {
  TQuestion,
  TQuestionCore,
  TQuestionInteger,
  TQuestionMatrix,
  TQuestionObjective,
  TQuestionParagraph,
} from "./types";

export function generateQuestionCore(
  coreQuestion: {
    id: string;
    type: "single" | "multiple" | "integer" | "paragraph" | "matrix";
    subject: string;
    chapters: { name: string; topics: string[] }[];
    topics: Array<string>;
    difficulty: "Easy" | "Medium" | "Hard" | "unset";
    exams: Array<string>;
    sources: Array<string>;
    isProofRead: boolean;
  },
  currentUser: ICurrentUser
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
  } = coreQuestion;
  return {
    id: id ? id : Date.now().toString(),
    type,
    subject: subject,
    chapters: chapters.map((chapter: any) => {
      let topicArray = topics;
      return {
        name: chapter.name,
        topics: topicArray?.length
          ? chapter.topics.filter((value: any) => topicArray.includes(value))
          : [],
      };
    }),
    difficulty: difficulty || "unset",
    exams: exams?.map((exam: any) => {
      if (exam?.name) return exam?.name;
      return exam;
    }),
    sources,
    topics,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    isProofRead,
    uploadedBy: {
      userType: currentUser?.userType as "operator" | "teacher" | "admin",
      id: currentUser.id,
    },
  };
}

export function generateObjectiveQuestion(
  questionCore: TQuestionCore,
  data: {
    en: {
      question: string;
      options: { id: string; value: string }[];
      solution: string;
    };
    hi: {
      question: string;
      options: { id: string; value: string }[];
      solution: string;
    };
    type: "single" | "multiple";
  },
  getCorrectAnswers: (options: { id: string; value: string }[]) => string[]
): TQuestionObjective {
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
      // @ts-ignore
      solution: data.hi.solution,
    },
    correctAnswers: getCorrectAnswers(data.en.options),
    type: data.type,
  };
}

export function generateIntegerQuestion(
  questionCore: TQuestionCore,
  data: {
    en: TQuestion;
    hi: TQuestion;
    correctAnswer: {
      from: number;
      to: number;
    };
  }
): TQuestionInteger {
  return {
    ...questionCore,
    en: data.en,
    // @ts-ignore
    hi: data.hi,
    correctAnswer: data.correctAnswer,
  };
}

export function generateParagraphQuestion(
  questionCore: TQuestionCore,
  data: {
    questions: Array<TQuestionObjective | TQuestionInteger>;
    paragraph: string;
  }
): TQuestionParagraph {
  return {
    ...questionCore,
    questions: data.questions,
    paragraph: data.paragraph,
  };
}

export function generateMatrixQuestion(
  questionCore: TQuestionCore,
  data: {
    en: TQuestion;
    hi: TQuestion;
    correctAnswers: Array<Array<string>>;
  }
): TQuestionMatrix {
  return {
    ...questionCore,
    en: data.en,
    // @ts-ignore
    hi: data.hi,
    correctAnswer: data.correctAnswers,
  };
}
