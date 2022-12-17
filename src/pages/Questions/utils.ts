export function getOptionID(questionType: string, count: number): string {
  return `OP_${questionType}_${Date.now()}_${String.fromCharCode(65 + count)}`;
}

export function generateOptions(
  questionType: string,
  count: number
): Array<{ id: string; value: string; isCorrectAnswer: boolean }> {
  let options = [];
  for (let i = 0; i < count; i++) {
    options.push({
      id: getOptionID(questionType, i),
      value: "",
      isCorrectAnswer: false,
    });
  }

  return options;
}

/**
 * Extracts the values after (a), (b), (c), and (d) in a string, along with the preceding text.
 *
 * @param {string} string - The input string.
 * @returns {Object} An object with the preceding text, the values after (a), (b), (c), and (d) as properties. The keys are the letters after the parentheses, and the values are the corresponding values.
 * @example
 * extractValues("The half life of a radioactive sample is 1600 years. After 800 years, if the number of radioactive nuclei changes by factor f then: (a) This is  some text (b) Something  more text (c) f = loge 2  even more text (d) Nice");
 * // returns { precedingText: "The half life of a radioactive sample is 1600 years. After 800 years, if the number of radioactive nuclei changes by factor f then: ", a: "This is", b: "Something", c: "f = loge 2", d: "Nice" }
 */
export function extractOptions(string: string): {
  precedingText: string;
  [key: string]: string;
} {
  const pattern = /(.*?)\(([a-z])\) (.*?)(?=\(([a-z])\)|$)/g;
  const values: { precedingText: string; [key: string]: string } = {
    precedingText: "",
  };

  let match;
  while ((match = pattern.exec(string))) {
    const precedingText = match[1];
    const letter = match[2];
    const value = match[3]?.trim();
    values[letter] = value;
    values.precedingText += precedingText;
  }

  return values;
}
