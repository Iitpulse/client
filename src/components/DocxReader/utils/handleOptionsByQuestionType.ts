import { checkAndReplaceSemicolon } from "./general";

export default function handleOptionByQuestionType(
  item: any,
  i: number,
  tableHeaders: string[],
  correctAnswerWithIndices: { [key: string]: string[] }
) {
  function handleOption({ value, extractedValues }: any, i: number) {
    if (extractedValues?.length) {
      correctAnswerWithIndices[i] = extractedValues;
    }
    return value;
  }

  const regex = /op\d/;

  let options = tableHeaders
    ?.filter((key) => regex.test(key))
    ?.map((key) => ({
      id: key,
      value: "",
    }));

  switch (item.type) {
    case "single":
    case "multiple":
      return {
        options: options?.map((op) => ({
          ...op,
          value: item[op.id],
        })),
        solution: handleOption(checkAndReplaceSemicolon(item.solution), i),
        correctAnswers: correctAnswerWithIndices[i],
      };
    case "integer":
      return {
        solution: handleOption(checkAndReplaceSemicolon(item.solution), i),
        correctAnswer: { from: item.op1, to: item.op2 },
      };
    default:
      return {};
  }
}
