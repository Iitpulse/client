import { capitalizeFirstLetter } from "../../../utils";
import { removeParaTag } from "./general";
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
