export const rnd = function generateRandomUniqueString(
  length: number = 10,
  chars: string = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
) {
  let result = "";
  for (let i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

export const getRndFromArray = function getRandomElementFromArray(
  array: any[]
) {
  return array[Math.floor(Math.random() * array.length)];
};

export const getRandomNoFromRange = function getRandomNoFromRange(
  min: number,
  max: number
) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getOption = function getNewOption() {
  const option = {
    description: getRndFromArray(["Charli", "Dennis", "Eddie", "Frank"]),
    // totalStudentSelected: getRandomNoFromRange(1, 59),
  };
  return option;
};

export const getFourNumberWhoseSumIs = function getFourNumberWhoseSumIs(
  sum: number
) {
  let a = getRandomNoFromRange(1, sum - 3);
  let b = getRandomNoFromRange(1, sum - a - 2);
  let c = getRandomNoFromRange(1, sum - a - b - 1);
  let d = sum - a - b - c;
  return [a, b, c, d];
};

export const getQuestion = function getNewQuestion() {
  const totalStudentAttempted = getRandomNoFromRange(10, 120);
  const fourNumberWhoseSumIsTotalStudentAttempted = getFourNumberWhoseSumIs(
    totalStudentAttempted
  );

  const question = {
    description:
      " Lorem ipsum dolor sit amet consectetur adipisicing elit Eaque qui accusamus pariatur fugit quod reprehenderit ut nonrecusandae reiciendis, doloremque doloralias quis sunt, deseruntaccusantium praesentium? Fuga minus ipsa amet obcaecati nesciunt qui.Nulla libero quibusdam itaquiure exercitationem.",
    selectedOptionIndex: getRndFromArray([0, 1, 2, 3]),
    correctOptionIndex: getRndFromArray([0, 1, 2, 3]),
    options: Array.from({ length: 4 }).map((item, index) => ({
      ...getOption(),
      id: rnd(),
      totalStudentSelected: fourNumberWhoseSumIsTotalStudentAttempted[index],
    })),
    timeTaken: getRndFromArray([
      1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]),
    averageTimeTaken: getRndFromArray([
      1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]),
    totalStudentAttempted,
    totalStudentCorrect: 20,
    quickestResponse: getRndFromArray([
      1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]),
    maxMarks: 4,
    solution: {
      description: "This is Solution",
    },

    averagePercentageAccuracy: 50,
  };
  return question;
};

export const getSection = function getNewSection() {
  const section = {
    maxMarks: 120,
    highestMarks: 112,
    averageMarks: 80,
    averagePercentageAccuracy: 120,
    totalQuestions: 30,
    totalStudentAppeared: 120,
    questions: Array.from({ length: 30 }).map((item) => ({
      ...getQuestion(),
      id: rnd(),
    })),
  };
  return section;
};

export const result = {
  testId: rnd(),
  name: "Sample Test",
  exam: { fullName: "JEE MAINS" },
  createdAt: "22/01/2032",
  status: "Ongoing",
  type: "Part Syllabus",
  duration: 180,
  scheduledFor: [
    "11 Jan 9:00 AM - 12:00 PM",
    "13 Jan 10:00 AM - 1:00 PM",
    "13 Jan 2:00 PM - 5:00 PM",
  ],
  maxMarks: 360,
  highestMarks: 233,
  totalQuestions: 90,
  totalStudentAppeared: 393,
  averageMarks: 148.2,
  averagePercentageAccuracy: 56.8,
  languages: [
    { id: "abc123", name: "English" },
    { id: "abc456", name: "Hindi" },
  ],
  sections: ["Physics", "Chemistry", "Maths"].map((item) => ({
    ...getSection(),
    id: rnd(),
    name: item,
  })),
};

export const results = Array.from({ length: 10 }).map((item) => ({
  ...result,
  id: rnd(),
}));
