import { useEffect, useState } from "react";
import { Button } from "../../../components";
import styles from "./Paragraph.module.scss";
import ReactQuill, { Quill } from "react-quill";
import Tabs, { tabsClasses } from "@mui/material/Tabs";
import {
  FormControlLabel,
  Radio,
  RadioGroup,
  Tab,
  Checkbox,
  FormGroup,
  IconButton,
} from "@mui/material";
import { formats, modules, TabPanel } from "../Common";
// @ts-ignore
import ImageResize from "quill-image-resize-module-react";
import clsx from "clsx";
import { generateOptions, getOptionID } from "../utils";
import { StyledMUISelect } from "../components";
import Objective from "../Objective/Objective";
import Integer from "../Integer/Integer";

interface Props {
  setData: (data: any) => void;
  data?: any;
  isInitialValuePassed?: boolean;
  setIsInitialValuePassed?: (value: boolean) => void;
  subject: string;
  chapters: Array<any>;
  topics: Array<any>;
  difficulty: string;
}

Quill.register("modules/imageResize", ImageResize);

const questionTypes = [{ name: "objective" }, { name: "integer" }];

const Paragraph: React.FC<Props> = ({
  setData,
  data,
  isInitialValuePassed,
  setIsInitialValuePassed,
  subject,
  chapters,
  topics,
  difficulty,
}) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [paragraph, setParagraph] = useState("");

  const [questions, setQuestions] = useState<Array<any>>(() => {
    let tempOptions = generateOptions("single", 4);
    return [
      {
        en: {
          question: "",
          options: tempOptions,
          solution: "",
        },
        hi: {
          question: "",
          options: tempOptions,
          solution: "",
        },
        isProofRead: false,
        id: "",
        type: "",
      },
    ];
  });

  function handlChangeQuestionsCount(type: "increment" | "decrement") {
    if (type === "increment") {
      let tempOptions = generateOptions("single", 4);
      setQuestions([
        ...questions,
        {
          en: {
            question: "",
            options: tempOptions,
            solution: "",
          },
          hi: {
            question: "",
            options: tempOptions,
            solution: "",
          },
          isProofRead: false,
          id: "",
          type: "",
        },
      ]);
    } else {
      setQuestions(questions.slice(0, questions.length - 1));
    }
  }

  function handleChangeData(values: any, idx: number) {
    console.log({ values, idx });
    setQuestions(
      questions.map((question, i) => (i === idx ? values : question))
    );
  }

  useEffect(() => {
    setData({
      paragraph,
      questions,
      type: "paragraph",
    });
  }, [questions]);

  useEffect(() => {
    console.log({ questions });
  }, [questions]);

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div className={styles.left}>
          <h3>Paragraph Type Question</h3>
          {/* <input
            name="assertionEnglish"
            id="assertionEnglish"
            type="checkbox"
            title="Assertion English"
            checked={assertionEnglish}
            onChange={(e: any) => setAssertionEnglish(e.target.checked)}
          />
          <label htmlFor="assertionEnglish"></label> */}
        </div>
        <div className={styles.languages}>
          <div
            className={currentLanguage === "en" ? styles.selected : ""}
            onClick={() => setCurrentLanguage("en")}
          >
            English
          </div>
          <div
            className={currentLanguage === "hi" ? styles.selected : ""}
            onClick={() => setCurrentLanguage("hi")}
          >
            Hindi
          </div>
        </div>
      </div>
      <section className={clsx(styles.editor, styles.paragraphEditor)}>
        <div className={styles.questionsCounter}>
          <p>Paragraph</p> <br />
          <div>
            <IconButton onClick={() => handlChangeQuestionsCount("decrement")}>
              -
            </IconButton>
            <span className={styles.count}>{questions.length}</span>
            <IconButton onClick={() => handlChangeQuestionsCount("increment")}>
              +
            </IconButton>
          </div>
        </div>
        <ReactQuill
          theme="snow"
          value={paragraph}
          onChange={setParagraph}
          modules={modules}
          formats={formats}
          bounds={styles.editor}
        />
        <br />
        <hr />
        <div className={styles.paraQuestionsContainer}>
          <div></div>
          {questions.map((_, i) => (
            <Question
              key={i}
              currentLanguage={currentLanguage}
              idx={i}
              subject={subject}
              chapters={chapters}
              topics={topics}
              difficulty={difficulty}
              data={questions[i]}
              setData={handleChangeData}
              isInitialValuePassed={false}
            />
          ))}
        </div>
      </section>
    </section>
  );
};

export default Paragraph;

const Question: React.FC<{
  currentLanguage: "en" | "hi";
  idx: number;
  subject: string;
  chapters: Array<any>;
  topics: Array<any>;
  difficulty: string;
  data: any;
  setData: (data: any, idx: number) => void;
  isInitialValuePassed: boolean;
}> = ({
  currentLanguage,
  idx,
  subject,
  chapters,
  topics,
  difficulty,
  data,
  setData,
  isInitialValuePassed,
}) => {
  const [type, setType] = useState("objective");
  const [localData, setLocalData] = useState(data);
  const [error, setError] = useState({
    type: false,
  });

  useEffect(() => {
    setData(localData, idx);
  }, [localData]);

  return (
    <div className={styles.question}>
      <StyledMUISelect
        label={"Type"}
        options={questionTypes}
        state={type}
        onChange={setType}
        error={error.type}
      />
      <br />
      <br />
      {type === "objective" ? (
        <Objective
          subject={subject}
          chapters={chapters}
          topics={topics}
          difficulty={difficulty}
          data={data}
          setData={setLocalData}
          isInitialValuePassed={isInitialValuePassed}
        />
      ) : (
        <Integer
          subject={subject}
          chapters={chapters}
          topics={topics}
          difficulty={difficulty}
          data={data}
          setData={setLocalData}
          isInitialValuePassed={isInitialValuePassed}
        />
      )}
      <br />
      <hr />
      <br />
    </div>
  );
};
