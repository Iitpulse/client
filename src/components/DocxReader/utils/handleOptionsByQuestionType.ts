import { checkAndReplaceSemicolon } from "./general";

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
  const regg = new RegExp(".*\&lt;correct&gt;");
  let options = tableHeaders
    ?.filter((key) => regex.test(key))
    ?.map((key) => ({
      id: key,
      value: "",
    }));

  switch (item.type) {
    case "single":
    case "multiple":
      let arr:string[] = [];
      options?.map((op)=>{
        var value = item[op.id];
        if(value.match(regg)){
          arr.push(op.id);
        }
      })
      correctAnswerWithIndices[i] = arr;
      return {
        options: options?.map((op) => ({
          ...op,
          value: item[op.id]
        })),
        solution: handleOption(checkAndReplaceSemicolon(item.solution), i),
        correctAnswers: correctAnswerWithIndices[i],
      };
    case "integer":
      return {
        solution: handleOption(checkAndReplaceSemicolon(item.solution), i),
        correctAnswer: { from: item.op1, to: item.op2 ?? item.op1 },
      };
    default:
      return {};
  }
}
