import { useState, useContext, useEffect } from "react";
import styles from "./Questions.module.scss";
import { Button, CreatableSelect, Card, ToggleButton } from "../../components";
import "react-quill/dist/quill.snow.css";
import Objective from "./Objective/Objective";
import Integer from "./Integer/Integer";
import Paragraph from "./Paragraph/Paragraph";
import { StyledMUISelect } from "./components";
import MatrixMatch from "./MatrixMatch/MatrixMatch";
import {
  IQuestionObjective,
  IQuestionInteger,
  IQuestionParagraph,
  IQuestionMatrix,
} from "../../utils/interfaces";
import { AuthContext } from "../../utils/auth/AuthContext";
import { Select, message } from "antd";
import { API_QUESTIONS, API_TESTS } from "../../utils/api/config";
import MainLayout from "../../layouts/MainLayout";
import { useParams } from "react-router";
import { useLocation } from "react-router-dom";
import { Skeleton } from "@mui/material";
import { checkQuestionValidity } from "./utils";
import {
  generateIntegerQuestion,
  generateMatrixQuestion,
  generateObjectiveQuestion,
  generateParagraphQuestion,
  generateQuestionCore,
} from "./utils/createQuestion";
import {
  questionIntegerSchema,
  questionMatrixSchema,
  questionObjectiveSchema,
  questionParagraphSchema,
} from "./utils/zodSchemas";
import {
  TQuestionInteger,
  TQuestionMatrix,
  TQuestionObjective,
  TQuestionParagraph,
} from "./utils/types";
import { ZodError } from "zod";
import { EQuestionType } from "./utils/types";
import CustomCreatableSelect from "../../components/CustomCreatableSelect";

const { Option } = Select;

export const questionTypes = [
  { name: "objective" },
  { name: "integer" },
  { name: "paragraph" },
  { name: "matrix" },
];

export const difficultyOptions = ["Easy", "Medium", "Hard", "Not Decided"];

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
  const [isStable, setIsStable] = useState<boolean>(false);
  const [uploadedBy, setUploadedBy] = useState<{
    userType: string;
    id: string;
  }>({
    userType: "operator",
    id: "",
  });
  const [topicOptions, setTopicOptions] = useState<any>([]);
  const [examOptions, setExamOptions] = useState<any>([]);
  const [sourceOptions, setSourceOptions] = useState<any>([]);
  const [data, setData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProofRead, setIsProofRead] = useState<boolean>(false);
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

  const apiEndpoints: Record<EQuestionType, string> = {
    [EQuestionType.Single]: "mcq/question",
    [EQuestionType.Multiple]: "mcq/question",
    [EQuestionType.Integer]: "numerical/question",
    [EQuestionType.Paragraph]: "paragraph/question",
    [EQuestionType.Matrix]: "matrix/question",
  };

  async function fetchData(questionType: EQuestionType, id: string) {
    const res = await API_QUESTIONS().get(
      `${apiEndpoints[questionType]}/${id}`,
      {
        params: { id },
      }
    );

    if (questionType === EQuestionType.Paragraph) {
      console.log({ para: res });
    }

    return res.data;
  }

  useEffect(() => {
    async function getQuestionData() {
      setIsLoading(true);

      const questionType = location.state.type as EQuestionType;
      if (!Object.values(EQuestionType).includes(questionType)) {
        throw new Error(
          "Invalid Question Type, Make Sure that you access this page via questions page"
        );
      }

      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        const questionData = await fetchData(questionType, id);

        const subject = subjectOptions?.find((sub: any) => {
          return (
            sub?.name?.toLowerCase() === questionData?.subject?.toLowerCase()
          );
        });

        let chapters: any = subject.chapters.filter(
          (chap: any) =>
            questionData.chapters?.findIndex(
              (qChapter: any) => qChapter.name === chap.name
            ) !== -1
        );
        let topics: any = [];
        chapters.forEach((chap: any) => {
          topics.push(...chap.topics);
        });
        topics = topics.map((topic: string) => ({ name: topic }));

        setData(questionData);
        setSubject(subject || {});
        setChapters(chapters || []);
        setTopics(() => {
          return topics || [];
        });
        setIsProofRead(questionData.isProofRead);
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
          questionData?.type === EQuestionType.Single ||
            questionData?.type === EQuestionType.Multiple
            ? questionTypes[0]?.name
            : questionData?.type
        );

        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
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

  async function createQuestion(
    endpoint: string,
    question:
      | TQuestionObjective
      | TQuestionInteger
      | TQuestionParagraph
      | TQuestionMatrix
  ) {
    const loading = message.loading("Creating Question...");
    await API_QUESTIONS().post(endpoint, question);
    loading();
    message.success("Question created successfully");
    setData({});
  }

  async function updateQuestion(
    endpoint: string,
    question:
      | TQuestionObjective
      | TQuestionInteger
      | TQuestionParagraph
      | TQuestionMatrix
  ) {
    const loading = message.loading("Updating Question...");
    await API_QUESTIONS().put(endpoint, question);
    loading();
    message.success("Question updated successfully");
  }

  async function validateAndProcessQuestion(
    finalQuestion:
      | TQuestionObjective
      | TQuestionInteger
      | TQuestionParagraph
      | TQuestionMatrix,
    questionType: "single" | "multiple" | "integer" | "paragraph" | "matrix"
  ) {
    try {
      let isDataValid = false;
      switch (questionType) {
        case "single":
        case "multiple":
          questionObjectiveSchema.parse(finalQuestion);
          isDataValid = true;
          break;
        case "integer":
          questionIntegerSchema.parse(finalQuestion);
          isDataValid = true;
          break;
        case "paragraph":
          questionParagraphSchema.parse(finalQuestion);
          isDataValid = true;
          break;
        case "matrix":
          questionMatrixSchema.parse(finalQuestion);
          isDataValid = true;
          break;
        default:
          break;
      }
      if (!isDataValid) {
        message.error("Invalid Question Data");
        return;
      }

      if (id) {
        await updateQuestion(`${questionType}/update/${id}`, finalQuestion);
      } else {
        await createQuestion(`${questionType}/new`, finalQuestion);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        error.issues.forEach((issue) => {
          setError((prev: any) => {
            return {
              ...prev,
              [issue.path[0]]: true,
              messages: prev.messages
                ? {
                    ...prev.messages,
                    [issue.path[0]]: issue.message,
                  }
                : {
                    [issue.path[0]]: issue.message,
                  },
            };
          });
        });
      }
      // @ts-ignore
      console.log(error, error?.issues);
    }
  }

  async function handleSubmitQuestion() {
    try {
      if (!currentUser) return;

      console.log(data);

      const questionCore = generateQuestionCore(
        {
          ...data,
          chapters,
          topics,
          subject: subject?.name,
          difficulty,
          exams,
          sources,
        },
        currentUser
      );

      switch (data.type) {
        case "single":
        case "multiple":
          await validateAndProcessQuestion(
            generateObjectiveQuestion(questionCore, data, getCorrectAnswers),
            data.type
          );
          break;
        case "integer":
          await validateAndProcessQuestion(
            generateIntegerQuestion(questionCore, data),
            "integer"
          );
          break;
        case "paragraph":
          await validateAndProcessQuestion(
            generateParagraphQuestion(questionCore, data),
            "paragraph"
          );
          break;
        case "matrix":
          await validateAndProcessQuestion(
            generateMatrixQuestion(questionCore, data),
            "matrix"
          );
          break;
        default:
          return;
      }

      resetQuestionForm();
    } catch (error) {
      message.success("ERR_CREATE_QUESTION" + error);
    }
  }

  function resetQuestionForm() {
    setTopics([]);
    setChapters([]);
    setSubject(undefined);
    setDifficulty("unset");
    setExams([]);
    setSources([]);
  }

  useEffect(() => {
    if (type === "paragraph") {
      if (
        isSubmitting &&
        (data?.en?.question || data?.questions[0]?.en?.question) &&
        isSubmitClicked
      ) {
        handleSubmitQuestion();
        setIsSubmitClicked(false);
      }
    } else if (isSubmitClicked) {
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
                  errorText={error.messages?.subject}
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
                <CustomCreatableSelect
                  mode="multiple"
                  options={subjectOptions?.map((sub: any) => ({
                    label: sub.name,
                    value: sub.name,
                  }))}
                  placeholder="Select Subject"
                  values={subject}
                  onChange={(vals: any) => setSubject(vals)}
                  onAddNewItem={handleAddSubject}
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
              <div className={styles.toggleProofRead}>
                Proof Read
                <ToggleButton
                  checked={isProofRead}
                  stopPropagation
                  onChange={(checked: any) => {
                    setIsProofRead(checked);
                  }}
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
                  setIsSubmitting,
                  isStable,
                  setIsStable
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
  setIsSubmitting: (data: any) => void,
  isStable: boolean,
  setIsStable: (data: any) => void
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
          isStable={isStable}
          setIsStable={setIsStable}
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
