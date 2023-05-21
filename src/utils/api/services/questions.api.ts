import { API_QUESTIONS } from "../config";

export async function createSubject(
  subjectId: string,
  chapter: {
    name: string;
    topics: string[];
  }
) {
  const res = await API_QUESTIONS().post("/subject/create-chapter", {
    subjectId,
    chapter,
  });
  return res;
}

export const questionsApiServices = {
  createSubject,
};
