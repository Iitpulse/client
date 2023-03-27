import { capitalizeFirstLetter } from "../../../utils";
import { getCoreQuestion, removeParaTag } from "./general";
import getQuestionObjectByType from "./getQuestionObjectByType";
import handleOptionByQuestionType from "./handleOptionsByQuestionType";

type Params = {
  item: any;
  i: number;
  currentUser: any;
  tableHeaders: string[];
};

export default function getParagraphObject({
  item,
  i,
  currentUser,
  tableHeaders,
}: Params) {
  let newObj: any = {
    ...getCoreQuestion(item, i, currentUser),
    paragraph: item.paragraph,
    questions: [],
  };
  let correctAnswerWithIndices: { [key: string]: string[] } = {};
  item.questions?.forEach((question: any, j: number) => {
    newObj = {
      ...newObj,
      questions: [
        ...newObj.questions,
        getQuestionObjectByType({
          item: question,
          i: j,
          currentUser,
          tableHeaders,
          correctAnswerWithIndices,
        }),
      ],
    };
  });

  return newObj;
}
