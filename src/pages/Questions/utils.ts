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
