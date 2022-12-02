import { useState, useContext, useEffect } from "react";
import styles from "./Questions.module.scss";
import {
  Sidebar,
  NotificationCard,
  Button,
  CreatableSelect,
  Navigate,
  Card,
} from "../../components";
import "react-quill/dist/quill.snow.css";
import Objective from "./Objective/Objective";
import Integer from "./Integer/Integer";
import Paragraph from "./Paragraph/Paragraph";
import { StyledMUITextField } from "../Users/components";
import {
  MUIChipsAutocomplete,
  MUISimpleAutocomplete,
  StyledMUISelect,
} from "./components";
import MatrixMatch from "./MatrixMatch/MatrixMatch";
import { IQuestionObjective, IQuestionInteger } from "../../utils/interfaces";
import { AuthContext } from "../../utils/auth/AuthContext";
import axios from "axios";
import { message } from "antd";
import { API_QUESTIONS, API_TESTS } from "../../utils/api";
import MainLayout from "../../layouts/MainLayout";
import { useParams, useLocation } from "react-router";
import { CircularProgress, Skeleton, Tooltip } from "@mui/material";

export const questionTypes = [
  { name: "Objective" },
  { name: "Integer" },
  { name: "Paragraph" },
  { name: "Matrix" },
];

// export const topicOptions = [
//   { name: `Coulomb's law`, value: "coulombsLaw" },
//   { name: "Organic", value: "organic" },
//   { name: "Hydrocarbons", value: "hydrocarbons" },
//   { name: "Probability", value: "probability" },
//   { name: "Tangets", value: "tangets" },
//   { name: "Ideal Gas Equation", value: "idealGasEquation" },
//   { name: "Dual Nature", value: "dualNature" },
//   { name: "Normals", value: "normals" },
//   { name: `Newton's Law of Motion`, value: "newtonsLawofMotion" },
// ];

// export const subjectOptions = ["Physics", "Mathematics", "Chemistry"];
export const difficultyOptions = ["Easy", "Medium", "Hard"];
// export const examOptions = ["JEE MAINS", "JEE ADVANCED", "NEET UG"];
// export const sourceOptions = ["Bansal Classes", "Allen", "Catalyser"];

interface IOptionType {
  name: string;
  inputValue?: string;
  value?: string | number;
}

const defaultErrorObject = {
  type: false,
  topics: false,
  subject: false,
  chapters: false,
  difficulty: false,
  exams: false,
  sources: false,
  en: false,
  hi: false,
  options: false,
  correctAnswers: false,
  uploadedBy: false,
};

function checkOptionsValidity(options: any) {
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

function checkTopicValidity(chapters: any) {
  for (let i = 0; i < chapters.length; i++)
    if (chapters[i].topics.length > 0) return true;

  return false;
}

function checkQuillParaValidity(para: any) {
  const stringToBeReplacedWithEmptySpace = ["<p>", "</p>", "</br>", "<br>"];
  const regex = new RegExp(stringToBeReplacedWithEmptySpace.join("|"), "gi");
  para = para.replace(regex, () => "");
  console.log({ para });
  if (!para) return false;
  return true;
}

function checkDataValidity(data: any, setError: any) {
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
  if (!data.exams?.length) {
    setError({ ...defaultErrorObject, exams: true });
    return { state: false, message: '"Please select at least one exam"' };
  }
  if (!data.chapters?.length) {
    setError({ ...defaultErrorObject, chapters: true });
    return { state: false, message: '"Please select at least one chapter"' };
  }
  // if (!checkTopicValidity(data?.chapters)) {
  //   setError({ ...defaultErrorObject, topics: true });
  //   return { state: false, message: '"Please select at least one topic"' };
  // }
  if (!data.sources?.length) {
    setError({ ...defaultErrorObject, sources: true });
    return { state: false, message: '"Please select at least one source"' };
  }
  const enQuestion = checkQuillParaValidity(data.en.question);
  const enOptions = checkOptionsValidity(data.en.options);
  const enSolution = checkQuillParaValidity(data.en.solution);
  if (!enQuestion) {
    setError({ ...defaultErrorObject, en: true });
    console.log("hola");
    return { state: false, message: "Please enter a valid question(English)" };
  }
  if (!enOptions) {
    console.log("NOT VALID OPTIONS");
    setError({ ...defaultErrorObject, en: true });
    return {
      state: false,
      message: "Make sure no option field is blank(English)",
    };
  }
  if (!enSolution) {
    setError({ ...defaultErrorObject, en: true });
    return { state: false, message: "Please enter a valid solution(English)" };
  }
  // if (
  //   !checkQuilParaValidity(data.hi.question, setMessage) ||
  //   !checkOptionsValidity(data.hi.options, setMessage) ||
  //   !checkQuilParaValidity(data.hi.solution, setMessage)
  // ) {
  //   setError({ ...defaultErrorObject, hi: true });
  //   return false;
  // }
  if (
    data.type === "objective" ||
    data.type === "multiple" ||
    data.type === "single"
  ) {
    if (data.correctAnswers.length < 1) {
      setError({ ...defaultErrorObject, correctAnswers: true });
      return {
        state: false,
        message: "At least one correct answer is required",
      };
    }
  } else if (data.type === "integer") {
    if (!data.correctAnswers.length) {
      setError({ ...defaultErrorObject, correctAnswers: true });
      return { state: false, message: "Please enter a valid OBJ(English)" };
    }
  } else if (data.type === "paragraph") {
    if (!data.correctAnswers.length) {
      setError({ ...defaultErrorObject, correctAnswers: true });
      return { state: false, message: "Please enter a valid OBJ(English)" };
    }
  } else if (data.type === "matrix") {
    if (!data.correctAnswers.length) {
      setError({ ...defaultErrorObject, correctAnswers: true });
      return { state: false, message: "Please enter a valid OBJ(English)" };
    }
  }
  return { state: true, message: "" };
}

const CreateQuestion = () => {
  // const [id, setId] = useState<string>("QM_ABC123");
  const [exams, setExams] = useState<Array<IOptionType>>([]);
  const [type, setType] = useState<any>(questionTypes[0]?.name);
  const [error, setError] = useState<any>(defaultErrorObject);
  const [subjectOptions, setSubjectOptions] = useState<any>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [subject, setSubject] = useState<any>({ name: "", value: "" });
  const [chapters, setChapters] = useState<Array<IOptionType>>([]);
  const [topics, setTopics] = useState<Array<IOptionType>>([]);
  const [difficulty, setDifficulty] = useState<string>("");
  const [sources, setSources] = useState<Array<IOptionType>>([]);
  const [uploadedBy, setUploadedBy] = useState<{
    userType: string;
    id: string;
  }>({
    userType: "operator",
    id: "",
  });
  // const [chapterOptions, setChapterOptions] = useState<any>([]);
  const [topicOptions, setTopicOptions] = useState<any>([]);
  const [examOptions, setExamOptions] = useState<any>([]);
  const [sourceOptions, setSourceOptions] = useState<any>([]);
  const [data, setData] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialValuePassed, setIsInitialValuePassed] =
    useState<boolean>(false);

  const { currentUser } = useContext(AuthContext);

  // useEffect(() => {
  //   console.log("%cRender Start", "color:green;font-size:20px");
  //   console.count("Render Start");
  // }, [data, subject, subjectOptions, chapters]);
  const { id } = useParams();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!id) setIsInitialValuePassed(true);
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    if (currentUser) {
      const allPromises = [
        API_QUESTIONS().get(`/subject/subjects`),
        API_TESTS().get("/exam/all"),
        API_QUESTIONS().get(`/source/all`),
      ];
      try {
        Promise.all(allPromises).then((res) => {
          setSubjectOptions(res[0].data);
          setExamOptions(res[1].data);
          setSourceOptions(res[2].data);
          setIsLoading(false);
        });
      } catch (error) {
        console.log(error);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    async function getQuestionData() {
      setIsLoading(true);
      const res = await API_QUESTIONS().get(`mcq/question/${id}`, {
        params: {
          id,
        },
      });

      const { data: questionData } = res;

      const subject = subjectOptions?.find((sub: any) => {
        // console.log({ sub, res });
        return (
          sub?.name?.toLowerCase() === questionData?.subject?.toLowerCase()
        );
      });
      // questionData.chapters?.map((chapter: any) => subject.chapters.find((chap: any) => chap.name === chapter))
      let chapters: any = subject.chapters.filter(
        (chap: any) =>
          questionData.chapters?.findIndex(
            (qChapter: any) => qChapter.name === chap.name
          ) !== -1
      );
      let topics: any = [];
      // chapters = chapters.map((stringArrayChapter: any) => {
      //   const newChapter = subject?.chapters?.find(
      //     (allInfoChapter: any) => allInfoChapter.name === stringArrayChapter
      //   );
      //   // console.log(newChapter);
      //   return newChapter;
      // });
      chapters.forEach((chap: any) => {
        topics.push(...chap.topics);
      });
      topics = topics.map((topic: string) => ({ name: topic }));
      // console.log(
      //   { mainData: res.data },
      //   { subject, chapters, topics, subjectOptions }
      // );
      console.log({ questionData });
      setData(questionData);
      setSubject(subject || {});
      setChapters(chapters || []);
      setTopics(() => {
        return topics || [];
      });
      setDifficulty(questionData.difficulty);
      setExams(
        questionData?.exams?.map((exam: string) => ({ name: exam })) ?? []
      );
      setSources(
        questionData?.sources?.map((source: string) => ({
          name: source,
          value: source,
        })) ?? []
      );

      setType(
        questionData?.type === "single" || questionData?.type === "multiple"
          ? questionTypes[0]?.name
          : questionData?.type
      );
      setIsLoading(false);
    }
    if (
      id &&
      currentUser &&
      pathname.includes("edit") &&
      subjectOptions?.length &&
      sourceOptions?.length &&
      examOptions?.length
    ) {
      getQuestionData();
    }
  }, [id, currentUser, pathname, subjectOptions, sourceOptions, examOptions]);

  useEffect(() => {
    if (chapters?.length) {
      let tempTopics: Array<IOptionType> = [];
      chapters.forEach((chapter: any) => {
        if (chapter.topics) {
          tempTopics = [...tempTopics, ...chapter.topics];
        }
      });
      setTopicOptions(tempTopics);
    } else {
      setTopics([]);
    }
  }, [chapters]);

  useEffect(() => {
    if (!topicOptions.length) {
      setTopics([]);
    }
  }, [topicOptions]);

  useEffect(() => {
    if (currentUser)
      setUploadedBy({ userType: currentUser?.userType, id: currentUser?.id });
  }, [currentUser]);

  async function handleAddSubject(sub: any) {
    const res = await API_QUESTIONS().post("/subject/create", {
      subject: sub,
      chapters: [],
    });
    setSubject(res.data.data);
    setSubjectOptions([...subjectOptions, res.data?.data]);
  }
  async function handleAddExam(exam: any) {
    const res = await API_TESTS().post("/exam/create", {
      exam,
    });
    setExamOptions([...examOptions, res.data]);
    // console.log({ res });
  }

  async function handleAddChapter(chapter: any) {
    // console.log({ chapter, subject });
    try {
      const res = await API_QUESTIONS().post("/subject/create-chapter", {
        subjectId: subject._id,
        chapter: {
          name: chapter,
          topics: [],
        },
      });
      const newSubjectData = res.data.data;
      setSubjectOptions((prev: any) => {
        const newSubjectOptions = prev.map((sub: any) =>
          sub._id === newSubjectData?._id ? newSubjectData : sub
        );
        return newSubjectOptions;
      });
      setSubject(newSubjectData);
      setChapters((prev: any) => {
        return [
          ...prev,
          newSubjectData.chapters[newSubjectData.chapters.length - 1],
        ];
      });
    } catch (err) {
      console.log(err);
      message.error("Error adding chapter");
    }
  }

  async function handleAddTopic(topic: any) {
    // console.log({ subject, chapters, topic });
    try {
      const res = await API_QUESTIONS().post("/subject/create-topic", {
        subjectId: subject._id,
        chapter: topic.chapter,
        topic: topic.topic,
      });

      setTopicOptions(
        chapters?.find((chapter: any) => chapter.name === topic.chapter)
          ? [...topicOptions, topic.topic]
          : [...topicOptions]
      );
      setTopics((prev: any) => {
        return chapters?.find((chapter: any) => chapter.name === topic.chapter)
          ? [...prev, topic.topic]
          : [...prev];
      });
      setChapters((prev: any) => {
        const newChapters = prev.map((chapter: any) => {
          if (chapter.name === topic.chapter) {
            chapter.topics.push(topic.topic);
          }
          return chapter;
        });
        return newChapters;
      });
      setSubjectOptions((prev: any) => {
        const newSubjectOptions = prev.map((sub: any) =>
          sub._id === subject._id ? res.data.data : sub
        );
        return newSubjectOptions;
      });
      setSubject(res.data.data);
    } catch (err) {
      console.log("ERR_ADD_TOPIC", err);
      message.error("Error adding topic");
    }

    // console.log({ res });
  }
  async function handleAddSource(source: string) {
    const res = await API_QUESTIONS().post("/source/create", {
      source,
    });
    setSourceOptions([...sourceOptions, res.data]);
    // console.log({ res });
  }

  // useEffect(() => {
  //   console.log({ subject, chapters, topics, subjectOptions, data });
  //   console.count();
  // }, [subject, chapters, topics]);

  async function handleSubmitQuestion() {
    //check if the url has edit in it then update the question
    // else create a new question

    try {
      if (currentUser) {
        let questionCore = {
          id: id ? id : Date.now().toString(),
          type: data.type,
          subject: subject?.name,
          chapters: chapters.map((chapter: any) => {
            let topicArray = topics.map((topic) => topic.name);
            return {
              name: chapter.name,
              topics: topicArray?.length
                ? chapter.topics.filter((value: any) =>
                    topicArray.includes(value)
                  )
                : [],
            };
          }),
          difficulty: difficulty || "unset",
          exams: exams.map((exam: any) => exam.name),
          sources: sources.map((source) => source.name),
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          isProofRead: false,
          uploadedBy: {
            userType: currentUser?.userType,
            id: currentUser.id,
          },
        };

        switch (data.type) {
          case "single":
          case "multiple":
            {
              // console.log("here ", { data });
              const finalQuestion: IQuestionObjective = {
                ...questionCore,
                en: {
                  question: data.en.question,
                  options: data.en.options,
                  solution: data.en.solution,
                },
                hi: {
                  question: data.hi.question,
                  options: data.hi.options,
                  solution: data.hi.solution,
                },
                correctAnswers: getCorrectAnswers(data.en.options),
              };
              // const fetchQuestion =  async () => {
              //   return await API_QUESTIONS().post(`/mcq/new`, finalQuestion);
              // };
              let res = "";

              let dataValid = checkDataValidity(finalQuestion, setError);
              if (!dataValid.state) {
                message.error(dataValid?.message);
              }
              if (dataValid?.state) {
                if (id) {
                  let loading = message.loading("Updating Question...");
                  res = await API_QUESTIONS().put(
                    `/mcq/update/${id}`,
                    finalQuestion
                  );
                  // console.log({ res });
                  loading();
                  message.success("Question updated successfully");
                  // setData({});
                } else {
                  let loading = message.loading("Creating Question...");
                  async function createNewQuestion() {
                    return await API_QUESTIONS().post(
                      `/mcq/new`,
                      finalQuestion
                    );
                  }
                  await createNewQuestion();
                  // const temp = Array(50)
                  //   .fill(null)
                  //   .map(() => createNewQuestion());
                  // await Promise.all(temp);
                  loading();
                  message.success("Question created successfully");
                  setData({});
                }
              }

              // console.log({ res });
            }
            break;
          case "integer":
            {
              const finalQuestion: IQuestionInteger = {
                ...questionCore,
                en: {
                  question: data.en.question,
                  solution: data.en.solution,
                },
                hi: {
                  question: data.hi.question,
                  solution: data.hi.solution,
                },
                correctAnswers: data.correctAnswers,
              };
              let dataValid = checkDataValidity(finalQuestion, setError);
              console.log({ finalQuestion });
              let res = "";
              if (dataValid.state) {
                if (id) {
                  let loading = message.loading("Updating Question...");
                  res = await API_QUESTIONS().put(
                    `/numerical/update/${id}`,
                    finalQuestion
                  );
                  loading();
                  message.success("Question Updated successfully");
                } else {
                  let loading = message.loading("Creating Question...");
                  res = await API_QUESTIONS().post(
                    `/numerical/new`,
                    finalQuestion
                  );
                  loading();
                  message.success("Question created successfully");
                  setData({});
                }
              }

              // console.log({ res });
            }
            break;
          default:
            return;
        }
      }
    } catch (error) {
      message.success("ERR_CREATE_QUESTION" + error);
    }
  }

  // useEffect(() => {
  //   console.log("%cRender End", "color:brown;font-size:14px");
  //   console.count("Render End");
  // }, [data, subject, subjectOptions, chapters]);

  return (
    <MainLayout name="Create Question">
      <div className={styles.container}>
        {isLoading ? (
          <div className={styles.loading}>
            <Skeleton width={"100%"} height={300} />
          </div>
        ) : (
          <Card classes={[styles.formContainer]}>
            <form>
              <div className={styles.inputFields}>
                <StyledMUISelect
                  label={"Type"}
                  options={questionTypes}
                  state={type}
                  onChange={setType}
                  error={error.type}
                  disabled={id ? true : false}
                />
                <StyledMUISelect
                  label={"Difficulty"}
                  options={difficultyOptions.map((difficulty) => ({
                    name: difficulty,
                  }))}
                  state={difficulty}
                  error={error.difficulty}
                  onChange={setDifficulty}
                />
                <CreatableSelect
                  onAddModalSubmit={handleAddSubject}
                  options={subjectOptions}
                  setValue={setSubject}
                  setChapters={setChapters}
                  setTopics={setTopics}
                  value={subject}
                  label={"Subject"}
                  error={error.subject}
                  id="subject"
                  loading
                />
                <CreatableSelect
                  multiple
                  onAddModalSubmit={handleAddExam}
                  options={examOptions.map((exam: any) => ({
                    name: exam.name,
                  }))}
                  setValue={setExams}
                  value={exams}
                  error={error.exams}
                  label={"Exam(s)"}
                  id="Exams"
                />

                <CreatableSelect
                  multiple
                  onAddModalSubmit={handleAddChapter}
                  options={subject?.chapters}
                  setValue={setChapters}
                  value={chapters}
                  error={error.chapters}
                  label={"Chapter(s)"}
                  id="Chapters"
                  disabled={!subject?.name?.length}
                  enableToolTip={true}
                  enabledToolTipTitle="Select a chapter"
                  disabledToolTipTitle="Please select a subject first"
                />

                <CreatableSelect
                  multiple
                  onAddModalSubmit={handleAddTopic}
                  options={topicOptions?.map((topic: any) => ({
                    name: topic,
                  }))}
                  chapters={subject?.chapters}
                  setValue={setTopics}
                  disabled={Boolean(!chapters?.length)}
                  value={topics}
                  error={error.topics}
                  label={"Topic(s)"}
                  id="Topics"
                  enableToolTip={true}
                  enabledToolTipTitle="Select a topic"
                  disabledToolTipTitle="Please select a chapter first"
                />
                <CreatableSelect
                  multiple
                  onAddModalSubmit={handleAddSource}
                  options={sourceOptions.map((source: any) => ({
                    name: source?.name,
                    value: source?.name,
                  }))}
                  setValue={setSources}
                  value={sources}
                  error={error.sources}
                  label={"Source(s)"}
                  id="Sources"
                />
              </div>
            </form>
          </Card>
        )}
        {isLoading ? (
          <div className={styles.loading}>
            <Skeleton width={"100%"} height={300} />
          </div>
        ) : (
          <>
            <section className={styles.main}>
              {type &&
                data &&
                getQuestionFromType(
                  type,
                  data,
                  setData,
                  isInitialValuePassed,
                  setIsInitialValuePassed,
                  subject?.name,
                  chapters,
                  topics,
                  difficulty
                )}
            </section>
            <div className={styles.submitButton}>
              <Button onClick={handleSubmitQuestion}>
                {id ? "Update" : "Submit"}
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default CreateQuestion;

function getQuestionFromType(
  type: string,
  data: any,
  setData: (data: any) => void,
  isInitialValuePassed: boolean,
  setIsInitialValuePassed: (data: any) => void,
  subject: string,
  chapters: Array<any>,
  topics: Array<any>,
  difficulty: string
) {
  switch (type.toLowerCase()) {
    case "objective":
      return (
        <Objective
          subject={subject}
          chapters={chapters}
          topics={topics}
          difficulty={difficulty}
          data={data}
          setData={setData}
          isInitialValuePassed={isInitialValuePassed}
          setIsInitialValuePassed={setIsInitialValuePassed}
        />
      );
    case "integer":
      return <Integer setData={setData} />;
    case "paragraph":
      return <Paragraph setData={setData} />;
    case "matrix":
      return <MatrixMatch setData={setData} />;
  }
}

function getCorrectAnswers(options: any) {
  return options
    .filter((option: any) => option.isCorrectAnswer)
    .map((option: any) => option.id);
}
