import { capitalizeFirstLetter } from "../../../utils";

export const removeParaTag = (str: string) => {
  return str?.replace(/<p>/g, "").replace(/<\/p>/g, "");
};

export function checkAndReplaceSemicolon(value: string): {
  value: string;
  extractedValues: string[];
} {
  const regexSemicolon = /op\d+\s*;/g;
  let newValue = value;
  const matchWithSemicolon = regexSemicolon.test(newValue);
  let ops: string[] = [];
  if (matchWithSemicolon) {
    // split the text by semicolon and add it to correctAnswers
    // remove '<p>' and '</p>' from the text
    ops = newValue
      ?.replace(/<p>/g, "")
      .replace(/<\/p>/g, "")
      .split(";")
      ?.filter((op) => op.length > 0 && op.startsWith("op"))
      ?.map((op) => op.trim()?.toLowerCase());
    // replace the text having semicolon with ""
    // newValue. = "";
    newValue = newValue.replace(regexSemicolon, "");
  }
  return {
    value: newValue,
    extractedValues: ops,
  };
}

export function getOptionID(str: string, type: string) {
  // convert values like op1, op2, op3 to option IDS like A, B, C
  return `OP_${type?.toUpperCase()}_${Date.now()}_${String.fromCharCode(
    64 + parseInt(str.replace("op", ""))
  )}`;
}

export const getCoreQuestion = (item: any, i: number, currentUser: any) => {
  return {
    id: Date.now().toString() + i,
    type: item.type,
    subject: removeParaTag(item.subject),
    difficulty: capitalizeFirstLetter(
      removeParaTag(item.difficulty || "Not Decided")
    ),
    exams: item.exams
      ?.split(",")
      .map((exam: string) => removeParaTag(exam.trim())),
    sources: item.sources
      ?.split(",")
      .map((source: string) => removeParaTag(source.trim())),
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
};
