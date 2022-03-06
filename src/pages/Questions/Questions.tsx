import * as React from "react";
import styles from "./Questions.module.scss";
import { Sidebar, NotificationCard } from "../../components";
import { useState } from "react";
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

export const topicOptions = [
  { name: `Coulomb's law`, value: "coulombsLaw" },
  { name: "Organic", value: "organic" },
  { name: "Hydrocarbons", value: "hydrocarbons" },
  { name: "Probability", value: "probability" },
  { name: "Tangets", value: "tangets" },
  { name: "Ideal Gas Equation", value: "idealGasEquation" },
  { name: "Dual Nature", value: "dualNature" },
  { name: "Normals", value: "normals" },
  { name: `Newton's Law of Motion`, value: "newtonsLawofMotion" },
];

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
  const [id, setId] = useState<string>("QM_ABC123");
  const [exams, setExams] = useState<Array<string>>([]);
  const [type, setType] = useState<string>("objective");
  const [subject, setSubject] = useState<string>("");
  const [chapter, setChapter] = useState<Array<string>>([]);
  const [topics, setTopics] = useState<Array<string>>([]);
  const [difficulty, setDifficulty] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [uploadedBy, setUploadedBy] = useState<string>("John Doe");
  console.log(type);
  React.useEffect(() => {
    console.log({
      id,
      type,
      subject,
      chapter,
      topics,
      difficulty,
      source,
      uploadedBy,
    });
  });

  return (
    <div className={styles.container}>
      <form>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="id"
            disabled
            label="Id"
            value={id}
            variant="outlined"
          />
          <MUIChipsAutocomplete
            label="Exam(s)"
            options={examList}
            onChange={setExams}
          />
          <StyledMUISelect
            label={"Type"}
            options={questionTypes}
            state={type}
            onChange={setType}
          />
          <StyledMUISelect
            label={"Subject"}
            options={subjects}
            state={subject}
            onChange={setSubject}
          />
          <MUIChipsAutocomplete
            label="Chapter(s)"
            options={chapters}
            onChange={setChapter}
          />
          <MUIChipsAutocomplete
            label="Topics"
            options={topicOptions}
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
            value={uploadedBy}
            label="Uploaded By"
            disabled
            variant="outlined"
          />
        </div>
      </form>
      {/* <hr /> */}
      <section className={styles.main}>
        {getQuestionFromType(type, id)}
      </section>
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

export default Questions;

function getQuestionFromType(type: string, id: string) {
  switch (type) {
    case "objective":
      return <Objective id={id} />;
    case "objective":
      return <Integer id={id} />;
    case "paragraph":
      return <Paragraph id={id} />;
  }
}
