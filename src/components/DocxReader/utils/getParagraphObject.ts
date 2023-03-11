import { capitalizeFirstLetter } from "../../../utils";
import { removeParaTag } from "./general";
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
  const coreQuestion = {
    _id: Date.now().toString()+i,
    type: item.type,
    subject: removeParaTag(item.subject),
    difficulty: capitalizeFirstLetter(
      removeParaTag(item.difficulty || "Not Decided")
    ),
    chapters: item.chapters
      ?.split(",")
      ?.map((chap: string) => removeParaTag(chap.trim()))
      ?.map((chap: string) => ({
        name: chap,
        topics: item.topics
          ?.split(",")
          ?.map((topic: string) => removeParaTag(topic.trim())),
      })),
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    uploadedBy: {
      id: currentUser?.id,
      userType: currentUser?.userType,
    },
  };
  let newObj: any = {
    ...coreQuestion,
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
