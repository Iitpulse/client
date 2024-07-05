import { useState, useContext, useEffect, useRef } from "react";
import styles from "./Questions.module.scss";
import { Button, Card, ToggleButton } from "../../components";
import "react-quill/dist/quill.snow.css";
import Objective from "./Objective/Objective";
import Integer from "./Integer/Integer";
import Paragraph from "./Paragraph/Paragraph";
import MatrixMatch from "./MatrixMatch/MatrixMatch";
import { AuthContext } from "../../utils/auth/AuthContext";
import { Form, FormInstance, Select, message } from "antd";
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
import CustomCreatableSelectMultiple from "../../components/CustomCreatableSelectMultiple";
import CustomCreatableSelectSingle from "../../components/CustomCreatableSelectSingle";
import CreateTopicDrawer from "./components/CreateTopicDrawer";

export const questionTypes = [
  { name: "objective" },
  { name: "integer" },
  { name: "paragraph" },
  { name: "matrix" },
];

export const difficultyOptions = ["Easy", "Medium", "Hard", "unset"];

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
  uploadedBy: false,
  objective: {
    en: false,
    hi: false,
    options: false,
    correctAnswers: false,
  },
  messages: {},
  integer: {},
  paragraph: {},
  matrix: {},
};

const CreateQuestion = () => {
  const location = useLocation();
  const [exams, setExams] = useState<Array<string>>([]);
  const [type, setType] = useState<any>(questionTypes[0]?.name);
  const [error, setError] = useState<any>({});
  const [subjectOptions, setSubjectOptions] = useState<any>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [subject, setSubject] = useState<any>({
    label: "",
    value: "",
    chapters: [],
  });
  const [chapters, setChapters] = useState<Array<string>>([]);
  const [topics, setTopics] = useState<Array<string>>([]);
  const [isSubmitClicked, setIsSubmitClicked] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<string>("");
  const [sources, setSources] = useState<Array<string>>([]);
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
  const [addNewTopicDrawerOpen, setAddNewTopicDrawerOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<any>(defaultErrorObject);

  const { currentUser } = useContext(AuthContext);

  const { id } = useParams();
  const { pathname } = useLocation();

  useEffect(() => {
    if (id) setIsInitialValuePassed(true);
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
        console.log({ questionData });
        const subject = subjectOptions?.find((sub: any) => {
          return (
            sub?.name?.toLowerCase() === questionData?.subject?.toLowerCase()
          );
        });

        let chapters: any = subject.chapters.filter(
          (chap: any) =>
            questionData.chapters?.findIndex(
              (qChapter: any) => qChapter?.name?.toLowerCase() === chap?.name?.toLowerCase()
            ) !== -1
        );
        let topics: any = [];
        questionData?.chapters?.forEach((chap: any) => {
          topics.push(...chap.topics);
        });
        topics = topics.map((topic: string) => ({ name: topic }));
        console.log({ questionData, subject, chapters, topics });
        setData(questionData);
        setSubject(
          { name: subject.name, value: subject.name, ...subject } || {}
        );
        setChapters(
          chapters.map((c: any) => ({
            ...c,
            name: c.name,
            value: c.name,
          })) || []
        );
        setTopics(() => {
          return (
            topics.map((t: any) => ({
              ...t,
              name: t.name,
              value: t.name,
            })) || []
          );
        });
        setIsProofRead(questionData.isProofRead);
        setDifficulty(questionData.difficulty);
        setExams(
          questionData?.exams?.map((exam: string) => ({
            name: exam,
            value: exam,
          })) ?? []
        );
        setSources(questionData?.sources ?? []);
        setType(
          questionData?.type === EQuestionType.Single ||
            questionData?.type === EQuestionType.Multiple
            ? questionTypes[0]?.name
            : questionData?.type
        );

        console.log({chapters,topics})

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
      name: sub,
      chapters: [],
    });
    setSubject(res.data.data);
    setSubjectOptions([...subjectOptions, res.data?.data]);
  }
  async function handleAddExam(exam: any) {
    const res = await API_TESTS().post("/exam/create", {
      name: exam,
      fullName: exam,
    });
    setExamOptions([...examOptions, res.data]);
    // console.log({ res });
  }

  async function handleAddChapter(chapter: string) {
    let chapterAddLoading = message.loading("Adding Chapter", 0);
    try {
      console.log({ subject });
      const res = await API_QUESTIONS().post("/subject/create-chapter", {
        subjectId: subject._id,
        name: chapter,
      });
      const newSubjectData = res.data.data;
      setSubjectOptions((prev: any) => {
        const newSubjectOptions = prev.map((sub: any) =>
          sub._id === newSubjectData?._id ? newSubjectData : sub
        );
        return newSubjectOptions;
      });
      setSubject({
        ...newSubjectData,
        label: newSubjectData.name,
        value: newSubjectData.name,
      });
      setChapters((prev: any) => {
        return [
          ...prev,
          newSubjectData.chapters[newSubjectData.chapters.length - 1],
        ]?.map((chap: any) => ({
          ...chap,
          label: chap.name,
          value: chap.name,
        }));
      });
      chapterAddLoading();
      message.success("Chapter Added Successfully");
    } catch (err) {
      console.log(err);
      chapterAddLoading();
      message.error("Error adding chapter");
    }
  }

  const findChapter = (chapterName: string) =>
    chapters?.find((chapter: any) => chapter.name === chapterName);

  const addTopicToExisting = (prev: any[], newTopic: string) => {
    return findChapter(newTopic) ? [...prev, newTopic] : [...prev];
  };

  async function handleAddTopic({
    chapter: chapterName,
    topic: topicName,
  }: {
    chapter: string;
    topic: string;
  }) {
    let topicAddLoading = message.loading("Adding Topic", 0);

    try {
      const res = await API_QUESTIONS().post("/subject/create-topic", {
        subject: subject._id,
        chapter: chapterName,
        name: topicName,
      });

      setTopicOptions(addTopicToExisting(topicOptions, topicName));
      setTopics((prev) => addTopicToExisting(prev, topicName));

      setChapters((prev: any) => {
        const newChapters = prev.map((chapter: any) => {
          if (chapter.name === chapterName) {
            chapter.topics.push(topicName);
          }
          return { ...chapter, label: chapter.name, value: chapter.name };
        });
        return newChapters;
      });

      setSubjectOptions((prev: any) => {
        const newSubjectOptions = prev.map((sub: any) =>
          sub._id === subject._id ? res.data.data : sub
        );
        return newSubjectOptions;
      });

      const newSubj = res.data.data;
      setSubject({ ...newSubj, label: newSubj.name, value: newSubj.name });
      topicAddLoading();
      message.success(`Topic ${topicName} added successfully`);
      setAddNewTopicDrawerOpen(false);
    } catch (error: any) {
      console.log(error);
      topicAddLoading();
      message.error(error.response.data.message);
    }
  }

  async function handleAddSource(source: string) {
    const addSourceLoading = message.loading("Adding Source...", 0);
    try {
      const res = await API_QUESTIONS().post("/source/create", {
        name: source,
      });
      setSourceOptions([...sourceOptions, res.data]);
      addSourceLoading();
      message.success("Source Added Successfully");
    } catch (error) {
      console.log(error);
      addSourceLoading();
      message.error("Error adding source");
    }
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
    const loading = message.loading("Creating Question...", 1);
    await API_QUESTIONS().post(endpoint, question);
    message.destroy(1);
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
    let isDataValid = false;
    console.log({ finalQuestion });

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
    let qtype: string = questionType;
    if (questionType === "single" || questionType === "multiple") {
      qtype = "mcq";
    } else if (questionType === "integer") {
      qtype = "numerical";
    }
    if (id) {
      await updateQuestion(`${qtype}/update/${id}`, finalQuestion);
    } else {
      await createQuestion(`${qtype}/new`, finalQuestion);
    }
  }

  function handleCreateQuestionZodError(error: ZodError) {
    let tempIssues: any = {};
    error.issues.forEach((issue) => {
      let path = `${issue.path.join(".")}`;
      tempIssues = {
        ...tempIssues,
        [path]: true,
        messages: tempIssues.messages
          ? {
              ...tempIssues.messages,
              [path]: issue.message,
            }
          : {
              [path]: issue.message,
            },
      };
      setFormErrors((prev: any) => {
        return {
          ...prev,
          [path]: true,
          messages: prev.messages
            ? {
                ...prev.messages,
                [path]: issue.message,
              }
            : {
                [path]: issue.message,
              },
        };
      });
    });
    if (tempIssues["en.question"]) {
      message.error(tempIssues.messages["en.question"]);
      return;
    }
    if (tempIssues["en.solution"]) {
      message.error(tempIssues.messages["en.solution"]);
      return;
    }
    if (tempIssues["correctAnswers"]) {
      message.error(tempIssues.messages["correctAnswers"]);
      return;
    }
    
    message.error("Please fill all required fields");
  }

  async function handleSubmitQuestion() {
    try {
      if (!currentUser) return;

      setFormErrors(defaultErrorObject);

      const questionCore = generateQuestionCore(
        {
          ...data,
          chapters,
          topics: topics.map((topic: any) => {
            if (topic?.name) return topic?.name;
            return topic;
          }),
          subject: subject?.value,
          difficulty,
          exams,
          sources,
          isProofRead,
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
      if (!id) {
        resetQuestionForm();
      }
    } catch (error) {
      console.log("ERROR_CREATE_QUESTION ", error);
      if (error instanceof ZodError) {
        handleCreateQuestionZodError(error);
      } else {
        message.error("ERR_CREATE_QUESTION" + error);
      }
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
      if (isSubmitting && isSubmitClicked) {
        handleSubmitQuestion();
        setIsSubmitClicked(false);
      }
    } else if (isSubmitClicked) {
      handleSubmitQuestion();
      setIsSubmitClicked(false);
    }
  }, [isSubmitClicked, data]);

  useEffect(() => {
    console.log({ chapters, subject, topics });
    if (chapters.length !== 0)
      setChapters((prev) => {
        return prev
          .filter((ch: any) =>
            subject?.chapters?.find((c: any) => c.id == ch.id)
          )
          .map((chap: any) => ({
            ...chap,
            label: chap.name,
            value: chap.name,
          }));
      });
    // setTopics([]);
  }, [subject]);
  useEffect(() => {
    console.log({ chapters, subject, topics });
    if (topics.length !== 0 && chapters.length !== 0)
      setTopics((prev) => {
        return prev.filter((topic: any) => {
          return (
            chapters?.find((chapter: any) => {
              return (
                chapter?.topics?.find(
                  (chapTopic: any) => chapTopic === topic.name
                ) ?? false
              );
            }) ?? false
          );
        });
      });
    // setTopics([]);
  }, [chapters]);
  function getErrorStatus(field: string) {
    return formErrors[field] ? "error" : "";
  }

  const formRef = useRef<FormInstance>(null);

  return (
    <MainLayout
      name="Create Question"
      menuActions={
        <div className={styles.submitButton}>
          <Button
            onClick={() => {
              // e.preventDefault();
              if (formRef.current) {
                // formRef.current.submit();
                setIsSubmitting(true);
                setIsSubmitClicked(true);
              }
            }}
          >
            {id ? "Update" : "Submit"}
          </Button>
        </div>
      }
    >
      <div className={styles.container}>
        {isLoading ? (
          <div className={styles.loading}>
            <Skeleton width={"100%"} height={300} />
          </div>
        ) : (
          <Card classes={[styles.formContainer]}>
            <Form layout="vertical" ref={formRef}>
              <div className={styles.inputFields}>
                <Form.Item
                  label="Type"
                  help={formErrors.messages.type}
                  validateStatus={getErrorStatus("type")}
                >
                  <CustomCreatableSelectSingle
                    showSearch
                    options={questionTypes.map((type) => ({
                      label: type.name,
                      value: type.name,
                    }))}
                    placeholder="Select Type"
                    value={type}
                    onChange={(value: any) => setType(value)}
                    showAddNew={false}
                  />
                </Form.Item>
                <Form.Item
                  label="Difficulty"
                  help={formErrors.messages.difficulty}
                  validateStatus={getErrorStatus("difficulty")}
                >
                  <CustomCreatableSelectSingle
                    showSearch
                    options={difficultyOptions.map((difficulty) => ({
                      label: difficulty,
                      value: difficulty,
                    }))}
                    placeholder="Select Difficulty"
                    value={difficulty}
                    onChange={(value: any) => setDifficulty(value)}
                    showAddNew={false}
                  />
                </Form.Item>
                <Form.Item
                  label="Exams"
                  help={formErrors.messages.exams}
                  validateStatus={getErrorStatus("exams")}
                >
                  <CustomCreatableSelectMultiple
                    showSearch
                    options={examOptions?.map((exam: any) => ({
                      label: exam.name,
                      value: exam.name,
                    }))}
                    placeholder="Select Exams"
                    newItemPlaceholder="Please enter new exam"
                    values={exams}
                    onChange={(vals: any) => setExams(vals)}
                    onAddNewItem={handleAddExam}
                  />
                </Form.Item>
                <Form.Item
                  label="Subject"
                  help={formErrors.messages.subject}
                  validateStatus={getErrorStatus("subject")}
                >
                  <CustomCreatableSelectSingle
                    showSearch
                    options={subjectOptions?.map((sub: any) => ({
                      ...sub,
                      label: sub.name,
                      value: sub.name,
                    }))}
                    placeholder="Select Subject"
                    newItemPlaceholder="Pleae enter new subject"
                    value={subject}
                    onChange={(_, chosenSubject: any) => {
                      setSubject(chosenSubject);
                    }}
                    onAddNewItem={handleAddSubject}
                  />
                </Form.Item>
                <Form.Item
                  label="Chapters"
                  help={formErrors.messages.chapters}
                  validateStatus={getErrorStatus("chapters")}
                >
                  <CustomCreatableSelectMultiple
                    showSearch
                    options={subject?.chapters?.map((chapter: any) => ({
                      label: chapter.name,
                      value: chapter.name,
                      ...chapter,
                    }))}
                    placeholder="Select Chapter(s)"
                    newItemPlaceholder="Pleae enter new chapter"
                    values={chapters}
                    disabled={subject?.chapters?.length === 0}
                    onChange={(_, chosenChapters: Array<any>) => {
                      setChapters(chosenChapters);
                      console.log({ chosenChapters });
                    }}
                    onAddNewItem={handleAddChapter}
                  />
                </Form.Item>

                <Form.Item
                  label="Topics"
                  help={formErrors.messages.topics}
                  validateStatus={getErrorStatus("topics")}
                >
                  <CustomCreatableSelectMultiple
                    showSearch
                    options={topicOptions?.map((topic: any) => ({
                      label: topic,
                      value: topic,
                    }))}
                    placeholder="Select Topic(s)"
                    newItemPlaceholder="Pleae enter new topic"
                    values={topics}
                    disabled={chapters?.length === 0}
                    onChange={(vals: string[]) => {
                      setTopics(vals);
                    }}
                    onClickAddNewBtn={() => {
                      setAddNewTopicDrawerOpen(true);
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label="Sources"
                  help={formErrors.messages.sources}
                  validateStatus={getErrorStatus("sources")}
                >
                  <CustomCreatableSelectMultiple
                    showSearch
                    options={sourceOptions?.map((source: any) => ({
                      label: source.name,
                      value: source.name,
                    }))}
                    placeholder="Select Source(s)"
                    newItemPlaceholder="Pleae enter new source"
                    values={sources}
                    onChange={(vals: string[]) => {
                      setSources(vals);
                    }}
                    onAddNewItem={handleAddSource}
                  />
                </Form.Item>
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
            </Form>
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
          </>
        )}
      </div>
      <CreateTopicDrawer
        open={addNewTopicDrawerOpen}
        onClose={() => setAddNewTopicDrawerOpen(false)}
        onClickAddTopic={handleAddTopic}
        chapterOptions={subject?.chapters?.map((chapter: any) => ({
          label: chapter.name,
          value: chapter.name,
          ...chapter,
        }))}
      />
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
  console.log({ data });

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