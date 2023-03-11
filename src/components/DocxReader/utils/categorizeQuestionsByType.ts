export default function categorizeQuestionsByType(questionsArr: any[]) {
  let paragraphQuestions: any[] = [];
  let singleQuestions = [];
  let multipleQuestions = [];
  let integerQuestions = [];

  for (let i = 0; i < questionsArr.length; i++) {
    const question = questionsArr[i];
    const { type } = question;
    if (type?.toLowerCase() === "single") {
      singleQuestions.push({ ...question, type: type?.toLowerCase() });
    } else if (type?.toLowerCase() === "multiple") {
      multipleQuestions.push({ ...question, type: type?.toLowerCase() });
    } else if (type?.toLowerCase() === "integer") {
      integerQuestions.push({ ...question, type: type?.toLowerCase() });
    } else if (type?.toLowerCase()?.startsWith("paragraph")) {
      let questionsCount = parseInt(type?.toLowerCase()?.split("-")[1]);
      let paraQuestions = [];
      for (let j = i + 1; j < i + 1 + questionsCount; j++) {
        const nextQuestion = questionsArr[j];
        paraQuestions.push({
          ...nextQuestion,
          type: nextQuestion.type?.toLowerCase(),
          subject: question.subject,
          topics: question.topics,
          chapters: question.chapters,
          sources: question.sources,
          exams: question.exams,
        });
      }
      i += questionsCount;
      paragraphQuestions.push({
        ...question,
        type: "paragraph",
        paragraph: question.question,
        questions: paraQuestions,
      });
    }
  }

  return {
    paragraphQuestions,
    singleQuestions,
    multipleQuestions,
    integerQuestions,
  };
}
