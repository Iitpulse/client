import { useState, useContext, useEffect, useRef } from "react";
import styles from "./Questions.module.scss";
import { Sidebar, NotificationCard, Button } from "../../components";
import "react-quill/dist/quill.snow.css";
import Objective from "./Objective/Objective";
import Integer from "./Integer/Integer";
import Paragraph from "./Paragraph/Paragraph";
import { StyledMUITextField } from "../Users/components";
import {
  MUIChipsAutocomplete,
  MUISimpleAutocomplete,
  QuestionsTable,
  StyledMUISelect,
} from "./components";
import MatrixMatch from "./MatrixMatch/MatrixMatch";
import { IQuestionObjective, IQuestionInteger } from "../../utils/interfaces";
import { AuthContext } from "../../utils/auth/AuthContext";
import axios from "axios";
import { CSVLink } from "react-csv";
import { useReactToPrint } from "react-to-print";
import { useNavigate } from "react-router-dom";
import { Grid } from "@mui/material";
import logo from "../../assets/images/logo.svg";

export const questionTypes = [
  { name: "Objective", value: "objective" },
  // { name: "Multiple Correct", value: "multiple" },
  { name: "Integer Type", value: "integer" },
  { name: "Paragraph", value: "paragraph" },
  { name: "Matrix Match", value: "matrix" },
];

export const subjects = [
  {
    name: "Physics",
    value: "physics",
  },
  {
    name: "Mathematics",
    value: "mathematics",
  },
  {
    name: "Chemistry",
    value: "chemistry",
  },
];

export const chapters = [
  {
    name: "Fluid Mechanics",
    value: "fluidMechanics",
  },
  {
    name: "Sets Relation and Functions",
    value: "setsRelationAndFunction",
  },
  {
    name: "Phenol",
    value: "phenol",
  },
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

export const difficultyLevels = [
  { name: "Easy", value: "easy" },
  { name: "Medium", value: "medium" },
  { name: "Hard", value: "hard" },
];

export const sources = [
  { name: "Bansal Classes", value: "bansalClasses" },
  { name: "Allen", value: "allen" },
  { name: "Catalyser", value: "catalyser" },
];

export const examList = [
  {
    name: "JEE MAINS",
    value: "JEEMains",
  },
  {
    name: "JEE ADVANCED",
    value: "JEEAdvanced",
  },
  {
    name: "NEET UG",
    value: "NEETUG",
  },
];

const Questions = () => {
  // const [id, setId] = useState<string>("QM_ABC123");
  const [exams, setExams] = useState<Array<string>>([]);
  const [type, setType] = useState<string>("objective");
  const [subject, setSubject] = useState<string>("");
  const [chapters, setChapters] = useState<Array<string>>([]);
  const [topics, setTopics] = useState<Array<string>>([]);
  const [difficulty, setDifficulty] = useState<string>("");
  const [source, setSource] = useState<string>("");
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

  // useEffect(() => {
  //   console.log({
  //     id,
  //     type,
  //     subject,
  //     chapter: chapters,
  //     topics,
  //     difficulty,
  //     source,
  //     uploadedBy,
  //   });
  // });

  useEffect(() => {
    if (subject?.length) {
      console.log(subject);
      axios
        .get(`http://localhost:5001/subject/chapter/`, {
          params: {
            subject,
          },
        })
        .then((res) => {
          console.log({ res });
          if (res.data) {
            setChapterOptions(res.data);
            setTopicOptions(res.data[0].topics);
          }
        });
    }
  }, [subject]);

  useEffect(() => {
    if (currentUser)
      setUploadedBy({ userType: currentUser?.userType, id: currentUser?.id });
  }, [currentUser]);

  const tableRef = useRef<any>(null);

  const handlePrint = useReactToPrint({
    content: () => tableRef.current,
  });

  async function handleSubmitQuestion() {
    if (currentUser) {
      let questionCore = {
        id: Date.now().toString(),
        type: data.type,
        subject,
        chapters,
        topics,
        difficulty,
        source,
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
            const res = await axios.post(
              "http://localhost:5001/mcq/new",
              finalQuestion
            );

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
            const res = await axios.post(
              "http://localhost:5001/numerical/new",
              finalQuestion
            );

            console.log({ res });
          }
          break;
        default:
          return;
      }
    }
  }

  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:5001/mcq/questions`).then((res) => {
      console.log({ res });
      setQuestions(res.data);
    });
  }, []);

  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      {/* <form>
        <div className={styles.inputFields}>
          <StyledMUISelect
            label={"Type"}
            options={questionTypes}
            state={type}
            onChange={setType}
          />
          <MUIChipsAutocomplete
            label="Exam(s)"
            options={examList}
            onChange={setExams}
          />
          <StyledMUISelect
            label={"Subject"}
            options={subjects}
            state={subject}
            onChange={setSubject}
          />
          <MUIChipsAutocomplete
            label="Chapter(s)"
            options={chapterOptions?.map((chapter: any) => ({
              name: chapter.name,
              value: chapter.name,
            }))}
            disabled={Boolean(!chapterOptions?.length)}
            onChange={setChapters}
          />
          <MUIChipsAutocomplete
            label="Topics"
            options={
              topicOptions.map((topic) => ({
                name: topic,
                value: topic,
              })) || []
            }
            onChange={setTopics}
          />
          <StyledMUISelect
            label={"Difficulty"}
            options={difficultyLevels}
            state={difficulty}
            onChange={setDifficulty}
          />
          <MUISimpleAutocomplete
            label={"Source"}
            options={sources}
            onChange={setSource}
          />
          <StyledMUITextField
            id="uploadedBy"
            value={uploadedBy.id}
            label="Uploaded By"
            disabled
            variant="outlined"
          />
        </div>
      </form> */}
      <div className={styles.flexRow}>
        <Button onClick={() => navigate("/questions/new")}>Add New</Button>
        <Button onClick={handlePrint}>Print</Button>
        <CSVLink filename={"Questions.csv"} data={questions}>
          Export to CSV
        </CSVLink>
      </div>
      <div>
        <QuestionsTable
          dataSource={questions?.map((question: any) => ({
            ...question,
            key: question.id || question._id,
          }))}
          height="70vh"
        />
      </div>
      {/* <hr /> */}
      {/* <section className={styles.main}>
        {getQuestionFromType(type, setData)}
      </section> */}
      {/* <div>
        <Button onClick={handleSubmitQuestion}>Submit</Button>
      </div> */}
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
      <div ref={tableRef} className={styles.printContainer}>
        <PrintTest
          subject="Physics"
          chapter="Ray Optics"
          title="Daily Rapid Test #025"
          questions={questions}
        />
      </div>
    </div>
  );
};

export default Questions;

const PrintTest: React.FC<{
  subject: string;
  chapter: string;
  title: string;
  questions: any[];
}> = ({ subject, chapter, title, questions }) => {
  return (
    <section className={styles.print}>
      <div className={styles.printHeader}>
        <div className={styles.upper}>
          <p>{subject}</p>
          <p>IOY</p>
          <p>{chapter}</p>
        </div>
        <div className={styles.lower}>
          <h2>{title}</h2>
          <p>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.questionsContainer}>
          <div className={styles.questions}>
            {questions.map((question: any, i: number) => (
              <div key={question.id} className={styles.question}>
                <span>{i + 1}.</span>
                <div>
                  <div
                    dangerouslySetInnerHTML={{ __html: question.en.question }}
                  ></div>
                  <Grid container className={styles.options}>
                    {question.en.options.map((option: any, j: number) => (
                      <Grid key={j} item md={6}>
                        <div className={styles.option}>
                          <span>{String.fromCharCode(97 + j)})</span>
                          <div
                            dangerouslySetInnerHTML={{ __html: option.value }}
                          ></div>
                        </div>
                      </Grid>
                    ))}
                  </Grid>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.questions}>
            {questions.map((question: any, i: number) => (
              <div key={question.id} className={styles.question}>
                <span>{i + 1}.</span>
                <div>
                  <div
                    dangerouslySetInnerHTML={{ __html: question.en.question }}
                  ></div>
                  <Grid container className={styles.options}>
                    {question.en.options.map((option: any, j: number) => (
                      <Grid key={j} item md={6} xs={6} lg={6} xl={6}>
                        <div className={styles.option}>
                          <span>{String.fromCharCode(97 + j)})</span>
                          <div
                            dangerouslySetInnerHTML={{ __html: option.value }}
                          ></div>
                        </div>
                      </Grid>
                    ))}
                  </Grid>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <img src={logo} alt="logo" />
      </div>
    </section>
  );
};

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
