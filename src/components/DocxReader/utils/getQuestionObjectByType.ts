import { capitalizeFirstLetter } from "../../../utils";
import { getCoreQuestion, removeParaTag } from "./general";
import handleOptionByQuestionType from "./handleOptionsByQuestionType";

type Params = {
  item: any;
  i: number;
  currentUser: any;
  tableHeaders: string[];
  correctAnswerWithIndices: { [key: string]: string[] };
};

export default function getQuestionObjectByType({
  item,
  i,
  currentUser,
  tableHeaders,
  correctAnswerWithIndices,
}: Params) {
  const { solution, options, ...rest }: any = handleOptionByQuestionType(
    item,
    i,
    tableHeaders,
    correctAnswerWithIndices
  );

  let newObj: any = {
    ...getCoreQuestion(item, i, currentUser),
  };

  switch (item.type) {
    case "single":
    case "multiple":
      newObj = {
        ...newObj,
        ...rest,
        en: {
          question: item.question,
          solution,
          options,
        },
        hi: {
          question: item.question,
          solution,
          options,
        },
      };
      break;
    case "integer":
      newObj = {
        ...newObj,
        ...rest,
        en: {
          question: item.question,
          solution,
        },
        hi: {
          question: item.question,
          solution,
        },
      };
      break;
    default:
      break;
  }

  return newObj;
}
