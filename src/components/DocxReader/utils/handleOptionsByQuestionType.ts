import {
  checkAndReplaceSemicolon,
  getOptionID,
  removeParaTag,
} from "./general";

export default function handleOptionByQuestionType(
  item: any,
  i: number,
  tableHeaders: string[],
  correctAnswerWithIndices: { [key: string]: string[] }
) {
  function handleOption({ value, extractedValues }: any, i: number) {
    // if (extractedValues?.length) {
    //   correctAnswerWithIndices[i] = extractedValues;
    // }
    // console.log(correctAnswerWithIndices[i]);
    return value;
  }

  const regex = /op\d/;
  const regg = new RegExp(".*&lt;correct&gt;");
  let options = tableHeaders
    ?.filter((key) => regex.test(key))
    ?.map((key) => ({
      id: key,
      value: "",
    }));

  function removeCorrectWord(s: string) {
    let ops = s?.replace(/&lt;correct&gt;/g, "");
    return ops;
  }

  switch (item.type) {
    case "single":
    case "multiple":
      let arr: string[] = [];
      correctAnswerWithIndices[i] = arr;
      return {
        options: options?.map((op) => {
          let value = item[op.id];
          const opID = getOptionID(op.id, item.type);
          if (value.match(regg)) {
            arr.push(opID);
            value = removeCorrectWord(value);
          }
          return {
            id: opID,
            value,
          };
        }),
        solution: handleOption(checkAndReplaceSemicolon(item.solution), i),
        correctAnswers: correctAnswerWithIndices[i],
      };
    case "integer":
      return {
        solution: handleOption(checkAndReplaceSemicolon(item.solution), i),
        correctAnswer: {
          from: parseFloat(removeParaTag(item.op1)),
          to: parseFloat(
            item.op2 ? removeParaTag(item.op2) : removeParaTag(item.op1)
          ),
        },
      };
    default:
      return {};
  }
}
