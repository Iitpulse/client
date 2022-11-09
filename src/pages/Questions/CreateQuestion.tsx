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
import { CircularProgress, Skeleton } from "@mui/material";

export const questionTypes = [
  { name: "Objective", value: "objective" },
  // { name: "Multiple Correct", value: "multiple" },
  { name: "Integer Type", value: "integer" },
  { name: "Paragraph", value: "paragraph" },
  { name: "Matrix Match", value: "matrix" },
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
export const chapterOptions = [
  "Fluid Mechanics",
  "Sets Relation and Functions",
  "Phenol",
];
// export const subjectOptions = ["Physics", "Mathematics", "Chemistry"];
export const difficultyOptions = ["Easy", "Medium", "Hard"];
// export const examOptions = ["JEE MAINS", "JEE ADVANCED", "NEET UG"];
// export const sourceOptions = ["Bansal Classes", "Allen", "Catalyser"];

interface IOptionType {
  name: string;
  inputValue?: string;
  value?: string | number;
}

const CreateQuestion = () => {
  // const [id, setId] = useState<string>("QM_ABC123");
  const [exams, setExams] = useState<Array<IOptionType>>([]);
  const [type, setType] = useState<string>("objective");
  const [subjectOptions, setSubjectOptions] = useState<any>([]);
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
        console.log("ERROR_INITIAL_VALUES_QUESTION", error);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    console.log("Main outside if");
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
      setData(questionData);
      setSubject(subject || {});
      console.log("THIS IS FUCKING RUNNING");
      setChapters(chapters || []);
      setTopics(topics || []);
      setDifficulty(questionData.difficulty);
      setExams(questionData.exams ?? []);
      setSources(
        (prev) =>
          prev?.filter((gSource: any) =>
            questionData.sources.includes(gSource.name)
          ) ?? []
      );
      setType(
        questionData?.type === "single" || questionData?.type === "multiple"
          ? "objective"
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
      console.log("Main inside if");
      getQuestionData();
    }
  }, [id, currentUser, pathname, subjectOptions, sourceOptions, examOptions]);

  useEffect(() => {
    if (pathname.includes("edit")) {
    }
    setTopics([]);
    setChapters([]);
    console.log("%cMake it Empty ", "color: red; font-size: 14px");
  }, [subject, pathname]);

  useEffect(() => {
    if (chapters?.length) {
      console.log({ chapters });
      let tempTopics: Array<IOptionType> = [];
      chapters.forEach((chapter: any) => {
        if (chapter.topics) {
          tempTopics = [...tempTopics, ...chapter.topics];
        }
      });
      setTopicOptions(tempTopics);
      // setTopics(tempTopics);
    } else {
      setTopics([]);
    }
  }, [chapters]);

  useEffect(() => {
    if (!topicOptions.length) {
      setTopics([]);
    } else
      setTopics((prev) =>
        prev.filter((tp: any) => topicOptions.includes(tp.name))
      );
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
    const res = await API_QUESTIONS().post("/subject/create-chapter", {
      subjectId: subject._id,
      chapter: {
        name: chapter,
        topics: [],
      },
    });
    // console.log({ res });
    // setChapterOptions([
    //   ...chapterOptions,
    //   {
    //     name: chapter,
    //     topics: [],
    //   },
    // ]);
    // setChapters(vals);
  }
  async function handleAddTopic(topic: any) {
    // console.log({ subject, chapters, topic });
    const res = await API_QUESTIONS().post("/subject/create-topic", {
      subjectId: subject._id,
      chapter: topic.chapter,
      topic: topic.topic,
    });
    setTopicOptions([...topicOptions, topic.topic]);
    // console.log({ res });
  }
  async function handleAddSource(source: string) {
    const res = await API_QUESTIONS().post("/source/create", {
      source,
    });
    setSourceOptions([...sourceOptions, res.data]);
    // console.log({ res });
  }

  // useEffect(()=>{

  // })

  // useEffect(() => {
  //   console.log({ subject, chapters, topics, subjectOptions, data });
  //   console.count();
  // }, [subject, chapters, topics]);

  async function handleSubmitQuestion() {
    //check if the url has edit in it then update the question
    // else create a new question

    let loading = message.loading("Creating Question...");
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
              topics: chapter.topics.filter((value: any) =>
                topicArray.includes(value)
              ),
            };
          }),
          difficulty,
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
              console.log({ finalQuestion });
              // const fetchQuestion =  async () => {
              //   return await API_QUESTIONS().post(`/mcq/new`, finalQuestion);
              // };
              let res = "";
              if (id) {
                res = await API_QUESTIONS().put(
                  `/mcq/update/${id}`,
                  finalQuestion
                );
                // console.log({ res });
              } else {
                async function createNewQuestion() {
                  return await API_QUESTIONS().post(`/mcq/new`, finalQuestion);
                }
                const temp = Array(50)
                  .fill(null)
                  .map(() => createNewQuestion());
                await Promise.all(temp);
                // console.log(temp);
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

              console.log({ finalQuestion });
              let res = "";
              if (id) {
                res = await API_QUESTIONS().put(
                  `/numerical/update/${id}`,
                  finalQuestion
                );
              } else {
                res = await API_QUESTIONS().post(
                  `/numerical/new`,
                  finalQuestion
                );
              }

              // console.log({ res });
            }
            break;
          default:
            return;
        }
        loading();
        message.success("Question created successfully");
        setData({});
      }
    } catch (error) {
      loading();
      message.success("Error" + error);
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
                  disabled={id ? true : false}
                />
                <StyledMUISelect
                  label={"Difficulty"}
                  options={difficultyOptions.map((difficulty) => ({
                    name: difficulty,
                    value: difficulty,
                  }))}
                  state={difficulty}
                  onChange={setDifficulty}
                />
                <CreatableSelect
                  onAddModalSubmit={handleAddSubject}
                  options={subjectOptions}
                  setValue={setSubject}
                  value={subject}
                  label={"Subject"}
                  id="subject"
                />
                <CreatableSelect
                  multiple
                  onAddModalSubmit={handleAddExam}
                  options={examOptions.map((exam: any) => ({
                    name: exam.name,
                    value: exam.name,
                  }))}
                  setValue={setExams}
                  value={exams}
                  label={"Exam(s)"}
                  id="Exams"
                />
                <CreatableSelect
                  multiple
                  onAddModalSubmit={handleAddChapter}
                  options={subject?.chapters}
                  setValue={setChapters}
                  value={chapters}
                  label={"Chapter(s)"}
                  id="Chapters"
                  disabled={!subject?.name?.length}
                />
                <CreatableSelect
                  multiple
                  onAddModalSubmit={handleAddTopic}
                  options={
                    topicOptions.map((topic: any) => ({
                      name: topic,
                    })) || []
                  }
                  chapters={subject?.chapters}
                  setValue={setTopics}
                  disabled={Boolean(!chapters?.length)}
                  value={topics}
                  label={"Topic(s)"}
                  id="Topics"
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
              {getQuestionFromType(
                type,
                data,
                setData,
                isInitialValuePassed,
                setIsInitialValuePassed
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
  setIsInitialValuePassed: (data: any) => void
) {
  switch (type) {
    case "objective":
      return (
        <Objective
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
