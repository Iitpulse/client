import { useState, useContext, useEffect } from "react";
import styles from "./Questions.module.scss";
import {
  Sidebar,
  NotificationCard,
  Button,
  CreatableSelect,
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
import { API_QUESTIONS } from "../../utils/api";

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
export const examOptions = ["JEE MAINS", "JEE ADVANCED", "NEET UG"];
export const sourceOptions = ["Bansal Classes", "Allen", "Catalyser"];

interface IOptionType {
  name: string;
  inputValue?: string;
  value?: string | number;
}

const CreateQuestion = () => {
  // const [id, setId] = useState<string>("QM_ABC123");
  const [exams, setExams] = useState<Array<IOptionType>>([]);
  const [type, setType] = useState<string>("objective");

  const [subjectOptions, setSubjectOptions] = useState([]);
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
  const [chapterOptions, setChapterOptions] = useState([]);
  const [topicOptions, setTopicOptions] = useState([]);
  const [data, setData] = useState<any>({});

  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (currentUser) {
      API_QUESTIONS()
        .get(`/subject/subjects`)
        .then((res) => {
          console.log({ sub: res.data });
          setSubjectOptions(res.data);
        });
    }
  }, [currentUser]);

  useEffect(() => {
    if (subject?.name?.length) {
      console.log(subject);
      API_QUESTIONS()
        .get(`/subject/chapter/`, {
          params: {
            subject: subject.name,
          },
        })
        .then((res) => {
          console.log({ res });
          if (res.data) {
            setChapterOptions(res.data);
            setTopicOptions(res.data[0].topics);
          } else {
            setChapterOptions([]);
            setTopicOptions([]);
          }
        })
        .catch((err) => {
          setChapterOptions([]);
          setTopicOptions([]);
        });
    }
  }, [currentUser, subject]);

  useEffect(() => {
    if (currentUser)
      setUploadedBy({ userType: currentUser?.userType, id: currentUser?.id });
  }, [currentUser]);

  async function handleAddSubject() {
    const res = await API_QUESTIONS().post("/subject/create", {
      subject: subject.name,
      chapters: [],
    });
    console.log({ res });
  }
  async function handleAddExam() {}
  async function handleAddChapter(chapter: any) {
    const res = await API_QUESTIONS().post("/subject/create-chapter", {
      subject: subject.name,
      chapter: chapter.name,
    });
    console.log({ res });
    // setChapters(vals);
  }
  async function handleAddTopic() {}
  async function handleAddSource() {}

  async function handleSubmitQuestion() {
    try {
      if (currentUser) {
        let questionCore = {
          id: Date.now().toString(),
          type: data.type,
          subject: subject?.name,
          chapters: chapters.map((chapter) => chapter.name),
          topics: topics.map((topic) => topic.name),
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
              const fetchQuestion = async () => {
                return await API_QUESTIONS().post(`/mcq/new`, finalQuestion);
              };
              const promises = Array(50).fill(fetchQuestion());
              const res = await Promise.all(promises);
              // const res = await API_QUESTIONS().post(`/mcq/new`, finalQuestion);

              message.success("Question created successfully");

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
              const res = await API_QUESTIONS().post(
                `/numerical/new`,
                finalQuestion
              );

              message.success("Question created successfully");

              console.log({ res });
            }
            break;
          default:
            return;
        }
      }
    } catch (error) {
      message.success("Error" + error);
    }
  }

  return (
    <div className={styles.container}>
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
          {/* <StyledMUISelect
            label={"Subject"}
            options={subjects}
            state={subject}
            onChange={setSubject}
          /> */}
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
            options={examOptions.map((exam) => ({
              name: exam,
              value: exam,
            }))}
            setValue={setExams}
            value={exams}
            label={"Exam(s)"}
            id="Exams"
          />
          <CreatableSelect
            multiple
            onAddModalSubmit={handleAddChapter}
            options={chapterOptions}
            setValue={setChapters}
            value={chapters}
            label={"Chapter(s)"}
            id="Chapters"
            disabled={!subject?.name?.length}
          />
          {/* <MUIChipsAutocomplete
            label="Exam(s)"
            options={examList}
            onChange={setExams}
          /> */}
          {/* <MUIChipsAutocomplete
            label="Chapter(s)"
            options={chapterOptions?.map((chapter: any) => ({
              name: chapter.name,
              value: chapter.name,
            }))}
            disabled={Boolean(!chapterOptions?.length)}
            onChange={setChapters}
          /> */}
          <CreatableSelect
            multiple
            onAddModalSubmit={handleAddTopic}
            options={
              topicOptions.map((topic) => ({
                name: topic,
                value: topic,
              })) || []
            }
            setValue={setTopics}
            value={topics}
            label={"Topic(s)"}
            id="Topics"
          />
          <CreatableSelect
            multiple
            onAddModalSubmit={handleAddSource}
            options={sourceOptions.map((source) => ({
              name: source,
              value: source,
            }))}
            setValue={setSources}
            value={sources}
            label={"Source(s)"}
            id="Sources"
          />
          {/* <MUIChipsAutocomplete
            label="Topics"
            options={
              topicOptions.map((topic) => ({
                name: topic,
                value: topic,
              })) || []
            }
            onChange={setTopics}
          /> */}
          {/* <CreatableSelect
            onAddModalSubmit={handleTempAdd}
            multiple
            options={[
              { name: "hehe", value: "sdf" },
              { name: "hehde", value: "sdddf" },
            ]}
            setValue={setTemp}
            value={temp}
            label={"This is label"}
            id="kjdkfj"
          />
          <CreatableSelect
            onAddModalSubmit={handleTempAdd}
            options={[
              { name: "hehe", value: "sdf" },
              { name: "hehde", value: "sdddf" },
            ]}
            setValue={setTempAnother}
            value={tempAnother}
            label={"This is label"}
            id="kjdkfj"
          /> */}
          {/* <MUISimpleAutocomplete
            label={"Source"}
            options={sources}
            onChange={setSource}
          /> */}
          <StyledMUITextField
            id="uploadedBy"
            value={uploadedBy.id}
            label="Uploaded By"
            disabled
            variant="outlined"
          />
        </div>
      </form>
      {/* <hr /> */}
      <section className={styles.main}>
        {getQuestionFromType(type, setData)}
      </section>
      <div>
        <Button onClick={handleSubmitQuestion}>Submit</Button>
      </div>
      <Sidebar title="Recent Activity">
        {Array(10)
          .fill(0)
          .map((_, i) => (
            <NotificationCard
              key={i}
              id="aasdadsd"
              status={i % 2 === 0 ? "success" : "warning"}
              title={"New Student Joined-" + i}
              description="New student join IIT Pulse Anurag Pal - Dropper Batch"
              createdAt="10 Jan, 2022"
            />
          ))}
      </Sidebar>
    </div>
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
