export const removeParaTag = (str: string) => {
  if (str?.startsWith("<p>") && str?.endsWith("</p>")) {
    return str.slice(3, str.length - 4);
  }
  return str;
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
