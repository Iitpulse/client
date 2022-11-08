import { useState, useContext, useEffect } from "react";
import styles from "./Questions.module.scss";
import {
  Sidebar,
  NotificationCard,
  Button,
  CreatableSelect,
  Navigate,
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
import { useParams } from "react-router";

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
  const [chapterOptions, setChapterOptions] = useState<any>([]);
  const [topicOptions, setTopicOptions] = useState<any>([]);
  const [examOptions, setExamOptions] = useState<any>([]);
  const [sourceOptions, setSourceOptions] = useState<any>([]);
  const [data, setData] = useState<any>({});

  const { currentUser } = useContext(AuthContext);

  const { id } = useParams();
  useEffect(() => {
    if (currentUser) {
      API_QUESTIONS()
        .get(`/subject/subjects`)
        .then((res) => {
          console.log({ sub: res.data });
          setSubjectOptions(res.data);
        });

      API_TESTS()
        .get("/exam/all")
        .then((res) => {
          setExamOptions(res.data);
        });

      API_QUESTIONS()
        .get(`/source/all`)
        .then((res) => {
          setSourceOptions(res.data);
        });
    }
  }, [currentUser]);

  useEffect(() => {
    setTopics([]);
    setChapters([]);
  }, [subject]);

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
    if (currentUser)
      setUploadedBy({ userType: currentUser?.userType, id: currentUser?.id });
  }, [currentUser]);

  async function handleAddSubject(sub: any) {
    console.log({ sub });
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
    console.log({ res });
  }

  async function handleAddChapter(chapter: any) {
    console.log({ chapter, subject });
    const res = await API_QUESTIONS().post("/subject/create-chapter", {
      subjectId: subject._id,
      chapter: {
        name: chapter,
        topics: [],
      },
    });
    console.log({ res });
    setChapterOptions([
      ...chapterOptions,
      {
        name: chapter,
        topics: [],
      },
    ]);
    // setChapters(vals);
  }
  async function handleAddTopic(topic: any) {
    console.log({ subject, chapters, topic });
    const res = await API_QUESTIONS().post("/subject/create-topic", {
      subjectId: subject._id,
      chapter: topic.chapter,
      topic: topic.topic,
    });
    setTopicOptions([...topicOptions, topic.topic]);
    console.log({ res });
  }
  async function handleAddSource(source: string) {
    const res = await API_QUESTIONS().post("/source/create", {
      source,
    });
    setSourceOptions([...sourceOptions, res.data]);
    console.log({ res });
  }

  useEffect(() => {
    if (id && window.location.href.includes("edit")) {
      API_QUESTIONS()
        .get(`mcq/question/${id}`)
        .then((res) => {
          console.log({ res });
          // setData(res.data);
          // setSubject(res.data.questions.subject);
          // setChapters(res.data.questions.chapters ?? []);
          // setTopics(res.data.questions.topics ?? []);
          // setDifficulty(res.data.questions.difficulty);
          // setExams(res.data.questions.exams ?? []);
          // setSources(res.data.questions.sources ?? []);
          // setType(res.data.questions.type);
        });
    }
  });

  async function handleSubmitQuestion() {
    //check if the url has edit in it then update the question
    // else create a new question

    let loading = message.loading("Creating Question...");
    try {
      if (currentUser) {
        let questionCore = {
          id: Date.now().toString(),
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
              if (window.location.href.includes("edit")) {
                res = await API_QUESTIONS().put(
                  `/mcq/update/${id}`,
                  finalQuestion
                );
                console.log({ res });
              } else {
                res = await API_QUESTIONS().post(`/mcq/new`, finalQuestion);
              }

              console.log({ res });
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
              if (window.location.href.includes("edit")) {
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

              console.log({ res });
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

  return (
    <MainLayout name="Create Question">
      <div className={styles.container}>
        <Navigate path={"/questions"}>Back To Questions</Navigate>
        <form>
          <div className={styles.inputFields}>
            <StyledMUISelect
              label={"Type"}
              options={questionTypes}
              state={type}
              onChange={setType}
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
        <section className={styles.main}>
          {getQuestionFromType(type, setData)}
        </section>
        <div className={styles.submitButton}>
          <Button onClick={handleSubmitQuestion}>
            {window.location.href.includes("edit") ? "Update" : "Submit"}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default CreateQuestion;

function getQuestionFromType(type: string, setData: (data: any) => void) {
  switch (type) {
    case "objective":
      return <Objective setData={setData} />;
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
