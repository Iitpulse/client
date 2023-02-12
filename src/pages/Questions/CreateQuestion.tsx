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
import {
  IQuestionObjective,
  IQuestionInteger,
  IQuestionParagraph,
  IQuestionMatrix,
} from "../../utils/interfaces";
import { AuthContext } from "../../utils/auth/AuthContext";
import axios from "axios";
import { message } from "antd";
import { API_QUESTIONS, API_TESTS } from "../../utils/api";
import MainLayout from "../../layouts/MainLayout";
import { useParams } from "react-router";
import { useLocation } from "react-router-dom";
import { CircularProgress, Skeleton, Tooltip } from "@mui/material";
import { checkQuestionValidity } from "./utils";

export const questionTypes = [
  { name: "objective" },
  { name: "integer" },
  { name: "paragraph" },
  { name: "matrix" },
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
export const difficultyOptions = ["Easy", "Medium", "Hard", "Not Decided"];
// export const examOptions = ["JEE MAINS", "JEE ADVANCED", "NEET UG"];
// export const sourceOptions = ["Bansal Classes", "Allen", "Catalyser"];

interface IOptionType {
  name: string;
  inputValue?: string;
  value?: string | number;
}

const defaultErrorObject = {
  objective: {
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
  },
  integer: {},
  paragraph: {},
  matrix: {},
};

const CreateQuestion = () => {
  // const [id, setId] = useState<string>("QM_ABC123");
  const location = useLocation();
  const [exams, setExams] = useState<Array<IOptionType>>([]);
  const [type, setType] = useState<any>(questionTypes[0]?.name);
  const [error, setError] = useState<any>({});
  const [subjectOptions, setSubjectOptions] = useState<any>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [subject, setSubject] = useState<any>({ name: "", value: "" });
  const [chapters, setChapters] = useState<Array<IOptionType>>([]);
  const [topics, setTopics] = useState<Array<IOptionType>>([]);
  const [isSubmitClicked, setIsSubmitClicked] = useState<boolean>(false);
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialValuePassed, setIsInitialValuePassed] =
    useState<boolean>(false);

  const { currentUser } = useContext(AuthContext);

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
    setData((prev: any) => ({
      ...prev,
      type: type === questionTypes[0].name ? "single" : type,
    }));
  }, [type]);

  useEffect(() => {
    async function getQuestionData() {
      setIsLoading(true);
      let res;
      switch (location.state.type) {
        case "single": {
        }
        case "multiple": {
          res = await API_QUESTIONS().get(`mcq/question/${id}`, {
            params: {
              id,
            },
          });
          break;
        }
        case "integer": {
          res = await API_QUESTIONS().get(`numerical/question/${id}`, {
            params: {
              id,
            },
          });
          break;
        }
        case "paragraph": {
          res = await API_QUESTIONS().get(`paragraph/question/${id}`, {
            params: {
              id,
            },
          });

          console.log({ para: res });
          break;
        }
        case "matrix": {
          res = await API_QUESTIONS().get(`matrix/question/${id}`, {
            params: {
              id,
            },
          });
          break;
        }
        default: {
          throw new Error(
            "Invalid Question Type, Make Sure that you access this page via questions page"
          );
        }
      }

      const { data: questionData } = res;
      console.log({ data });

      const subject = subjectOptions?.find((sub: any) => {
        // console.log({ sub, res });
        return (
          sub?.name?.toLowerCase() === questionData?.subject?.toLowerCase()
        );
      });
      // console.log({ fetched: res.data });
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

  // useEffect(() => {
  //   setData((prev: any) => {
  //     return { ...prev, type: type.toLowerCase() };
  //   });
  // }, [type]);

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
          ? [...prev, { name: topic.topic }]
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

  async function handleSubmitQuestion() {
    //check if the url has edit in it then update the question
    // else create a new question
    // console.log({ data });

    try {
      if (currentUser) {
        // console.log("Im inside");
        let questionCore = {
          id: id ? id : Date.now().toString(),
          type,
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

        // console.log({ questionCore });

        switch (data.type) {
          // allow fall through
          // eslint-disable-next-line no-fallthrough
          // @ts-ignore
          case "single":
          // @ts-ignore
          // eslint-disable-next-line no-fallthrough
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
              // console.log("OBJECTIVE", { finalQuestion }, "Before Validation");
              let res = "";

              let dataValid = checkQuestionValidity(
                finalQuestion,
                setError,
                defaultErrorObject.objective
              );
              if (!dataValid.state) {
                message.error(dataValid?.message);
                return;
              }
              // console.log("OBJECTIVE", { finalQuestion }, "After Validation");
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
                correctAnswer: data.correctAnswer ?? { from: "", to: "" },
              };
              // console.log("INTEGER", { finalQuestion }, "Before Validation");
              let dataValid = checkQuestionValidity(
                finalQuestion,
                setError,
                defaultErrorObject.integer
              );

              if (!dataValid.state) {
                message.error(dataValid?.message);
                return;
              }
              // console.log("INTEGER", { finalQuestion }, "After Validation");
              let res = "";

              if (dataValid.state) {
                if (id) {
                  let loading = message.loading("Updating Question...");
                  res = await API_QUESTIONS().put(
                    `/numerical/update/${id}`,
                    finalQuestion
                  );
                  loading();
                  // console.log({ res });
                  message.success("Question Updated successfully");
                } else {
                  let loading = message.loading("Creating Question...");
                  // console.log("Hello This is Test");
                  async function createNewIntegerQuestion() {
                    return await API_QUESTIONS().post(
                      `/numerical/new`,
                      finalQuestion
                    );
                  }
                  await createNewIntegerQuestion();
                  // const temp = Array(50)
                  //   .fill(null)
                  //   .map(() => createNewIntegerQuestion());
                  // await Promise.all(temp);
                  // const res = await API_QUESTIONS().post(
                  //   `/numerical/new`,
                  //   finalQuestion
                  // );
                  // console.log({ res });
                  loading();
                  message.success("Question created successfully");
                  setData({});
                }
              }

              // console.log({ res });
            }
            break;
          case "paragraph":
            {
              const finalQuestion: IQuestionParagraph = {
                ...questionCore,
                questions: data.questions,
                paragraph: data.paragraph,
              };
              // console.log("PARAGRAPH", { finalQuestion }, "Before Validation");
              let dataValid = checkQuestionValidity(
                finalQuestion,
                setError,
                defaultErrorObject.paragraph
              );
              if (!dataValid.state) {
                message.error(dataValid?.message);
                return;
              }
              // console.log("PARAGRAPH", { finalQuestion }, "After Validation");
              if (dataValid.state) {
                if (id) {
                  let loading = message.loading("Updating Question...");

                  // const res = await API_QUESTIONS().put(
                  //   `/paragraph/update/${id}`,
                  //   finalQuestion
                  // );

                  loading();

                  message.success("Question Updated successfully");
                } else {
                  let loading = message.loading("Creating Question...");
                  console.log({ finalQuestion, data });
                  // return;
                  const res = await API_QUESTIONS().post(
                    `/paragraph/new`,
                    finalQuestion
                  );
                  console.log({ res });
                  loading();
                  message.success("Question created successfully");
                  setIsSubmitting(false);
                  setData({});
                }
              }
            }
            break;
          case "matrix":
            {
              const finalQuestion: IQuestionMatrix = {
                ...questionCore,
                correctAnswers: data.correctAnswers,
              };
              // console.log("MATRIX", { finalQuestion }, "Before Validation");
              let dataValid = checkQuestionValidity(
                finalQuestion,
                setError,
                defaultErrorObject.matrix
              );
              if (!dataValid.state) {
                message.error(dataValid?.message);
                return;
              }
              // console.log("MATRIX", { finalQuestion }, "After Validation");
              if (dataValid.state) {
                if (id) {
                  let loading = message.loading("Updating Question...");
                  const res = await API_QUESTIONS().put(
                    `/matrix/update/${id}`,
                    finalQuestion
                  );
                  loading();
                  message.success("Question Updated successfully");
                } else {
                  let loading = message.loading("Creating Question...");
                  const res = await API_QUESTIONS().post(
                    `/matrix/new`,
                    finalQuestion
                  );
                  loading();
                  message.success("Question created successfully");
                  setData({});
                }
              }
            }
            break;

          default:
            return;
        }
        setTopics([]);
        setChapters([]);
        setSubject(undefined);
        setDifficulty("unset");
        setExams([]);
        setSources([]);
      }
    } catch (error) {
      message.success("ERR_CREATE_QUESTION" + error);
    }
    // setIsSubmitting(false);
  }

  useEffect(() => {
    console.log({ questionDataMain: data });
  }, [data]);

  useEffect(() => {
    if (
      isSubmitting &&
      (data?.en?.question || data?.questions[0]?.en?.question) &&
      isSubmitClicked
    ) {
      handleSubmitQuestion();
      setIsSubmitClicked(false);
    }
  });

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
                  difficulty,
                  isSubmitting,
                  setIsSubmitting
                )}
            </section>
            <div className={styles.submitButton}>
              <Button
                onClick={(e) => {
                  setIsSubmitting(true);
                  setIsSubmitClicked(true);
                }}
              >
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
  difficulty: string,
  isSubmitting: boolean,
  setIsSubmitting: (data: any) => void
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
      return (
        <Integer
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
    case "paragraph":
      return (
        <Paragraph
          subject={subject}
          chapters={chapters}
          topics={topics}
          difficulty={difficulty}
          data={data}
          setData={setData}
          isSubmitting={isSubmitting}
          isInitialValuePassed={isInitialValuePassed}
          setIsInitialValuePassed={setIsInitialValuePassed}
        />
      );
    case "matrix":
      return (
        <MatrixMatch
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
  }
}

function getCorrectAnswers(options: any) {
  return options
    .filter((option: any) => option.isCorrectAnswer)
    .map((option: any) => option.id);
}
