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

export function checkTopicValidity(chapters: any) {
  for (let i = 0; i < chapters.length; i++)
    if (chapters[i].topics.length > 0) return true;

  return false;
}

export function checkQuillParaValidity(para: any) {
  const stringToBeReplacedWithEmptySpace = ["<p>", "</p>", "</br>", "<br>"];
  const regex = new RegExp(stringToBeReplacedWithEmptySpace.join("|"), "gi");
  para = para.replace(regex, () => "");
  console.log({ para });
  if (!para) return false;
  return true;
}

export function checkOptionsValidity(options: any) {
  if (options.length < 4) return false;
  for (let i = 0; i < options.length; i++) {
    if (
      !options[i].value ||
      !options[i].id ||
      !checkQuillParaValidity(options[i].value)
    ) {
      console.log(options[i]);
      return false;
    }
  }
  return true;
}

export function checkQuestionValidity(
  data: any,
  setError: any,
  defaultErrorObject: any
) {
  // Checking Question Core Fields - Start
  if (!data.type) {
    setError({ ...defaultErrorObject, type: true });
    return { state: false, message: '"Please select a question type"' };
  }
  // if (!data.difficulty) {
  //   setError({ ...defaultErrorObject, difficulty: true });
  //   return { state: false, message: '"Please select a difficulty level"' };
  // }
  if (!data.subject) {
    setError({ ...defaultErrorObject, subject: true });
    return { state: false, message: '"Please select a subject"' };
  }
  // if (!data.exams?.length) {
  //   setError({ ...defaultErrorObject, exams: true });
  //   return { state: false, message: '"Please select at least one exam"' };
  // }
  if (!data.chapters?.length) {
    setError({ ...defaultErrorObject, chapters: true });
    return { state: false, message: '"Please select at least one chapter"' };
  }
  // if (!checkTopicValidity(data?.chapters)) {
  //   setError({ ...defaultErrorObject, topics: true });
  //   return { state: false, message: '"Please select at least one topic"' };
  // }
  // if (!data.sources?.length) {
  //   setError({ ...defaultErrorObject, sources: true });
  //   return { state: false, message: '"Please select at least one source"' };
  // }
  // Checking Question Core Fields - End

  // Checking Question Type Dependent Fields - Start
  
  switch (data.type) {
    case "single":
    case "multiple":
      {
        const enQuestion = checkQuillParaValidity(data.en.question);
        const enOptions = checkOptionsValidity(data.en.options);
        const enSolution = checkQuillParaValidity(data.en.solution);
        if (!enQuestion) {
          setError({ ...defaultErrorObject, en: true });
          return {
            state: false,
            message: "Please enter a valid question(English)",
          };
        }
        if (!enOptions) {
          setError({ ...defaultErrorObject, en: true });
          return {
            state: false,
            message: "Make sure no option field is blank(English)",
          };
        }
        if (!enSolution) {
          setError({ ...defaultErrorObject, en: true });
          return {
            state: false,
            message: "Please enter a valid solution(English)",
          };
        }
        if (data?.correctAnswers?.length < 1) {
          setError({ ...defaultErrorObject, correctAnswers: true });
          return {
            state: false,
            message: "At least one correct answer is required",
          };
        }
      }
      break;
    case "integer":
      {
        if (
          data.correctAnswer.from.toString() === "" ||
          data.correctAnswer.to.toString() === ""
        ) {
          setError({ ...defaultErrorObject, correctAnswers: true });
          return {
            state: false,
            message: "Please enter a valid range in FROM and TO",
          };
        }
      }
      break;
    case "paragraph":
      {
      }
      break;
    case "matrix":
      {
      }
      break;
    default: {
      setError({ ...defaultErrorObject, type: true });
      return { state: false, message: '"Please select a valid question type"' };
    }
  }

  // Checking Question Type Dependent Fields - Ends

  // if (
  //   !checkQuilParaValidity(data.hi.question, setMessage) ||
  //   !checkOptionsValidity(data.hi.options, setMessage) ||
  //   !checkQuilParaValidity(data.hi.solution, setMessage)
  // ) {
  //   setError({ ...defaultErrorObject, hi: true });
  //   return false;
  // }
  return { state: true, message: "" };
}
