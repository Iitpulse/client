export default function categorizeQuestionsByType(questionsArr: any[]) {
  let paragraphQuestions: any[] = [];
  let singleQuestions = [];
  let multipleQuestions = [];
  let integerQuestions = [];

  for (let i = 0; i < questionsArr.length; i++) {
    const question = questionsArr[i];
    const { type } = question;
    if (type === "single") {
      singleQuestions.push(question);
    } else if (type === "multiple") {
      multipleQuestions.push(question);
    } else if (type === "integer") {
      integerQuestions.push(question);
    } else if (type?.startsWith("paragraph")) {
      let questionsCount = parseInt(type?.split("-")[1]);
      let paraQuestions = [];
      for (let j = i + 1; j < i + 1 + questionsCount; j++) {
        const nextQuestion = questionsArr[j];
        paraQuestions.push({
          ...nextQuestion,
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
