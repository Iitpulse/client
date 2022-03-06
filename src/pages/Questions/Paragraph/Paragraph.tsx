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

interface Props {
  id: string;
}

Quill.register("modules/imageResize", ImageResize);

const Paragraph: React.FC<Props> = ({ id }) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [paragraph, setParagraph] = useState("");
  const [questions, setQuestions] = useState([
    {
      en: {
        question: "",
        options: [...Array(4).fill({ id, value: "", isCorrectAnswer: false })],
        solution: "",
      },
      hi: {
        question: "",
        options: [...Array(4).fill({ id, value: "", isCorrectAnswer: false })],
        solution: "",
      },
    },
  ]);

  function handlChangeQuestionsCount(type: "increment" | "decrement") {
    if (type === "increment") {
      setQuestions([
        ...questions,
        {
          en: {
            question: "",
            options: [
              ...Array(4).fill({ id, value: "", isCorrectAnswer: false }),
            ],
            solution: "",
          },
          hi: {
            question: "",
            options: [
              ...Array(4).fill({ id, value: "", isCorrectAnswer: false }),
            ],
            solution: "",
          },
        },
      ]);
    } else {
      setQuestions(questions.slice(0, questions.length - 1));
    }
  }

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
        <br />
        {questions.map((_, i) => (
          <Question currentLanguage={currentLanguage} id={id} idx={i + 1} />
        ))}
      </section>
    </section>
  );
};

export default Paragraph;

const Question: React.FC<{
  currentLanguage: "en" | "hi";
  id: string;
  idx: number;
}> = ({ currentLanguage, id, idx }) => {
  const [tab, setTab] = useState(0);
  const [optionsCount, setOptionsCount] = useState(4);
  const [answerType, setAnswerType] = useState<"single" | "multiple">("single");

  const [values, setValues] = useState<any>({
    en: {
      question: "",
      options: [
        ...Array(optionsCount).fill({ id, value: "", isCorrectAnswer: false }),
      ],
      solution: "",
    },
    hi: {
      question: "",
      options: [
        ...Array(optionsCount).fill({ id, value: "", isCorrectAnswer: false }),
      ],
      solution: "",
    },
  });

  useEffect(() => {
    console.log({ values });
  }, [values]);

  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  function handleChaneOptionsCount(type: "increment" | "decrement") {
    if (type === "increment") {
      setOptionsCount((prev) => prev + 1);
      setValues({
        ...values,
        en: {
          ...values.en,
          options: [
            ...values.en.options,
            { id, value: "", isCorrectAnswer: false },
          ],
        },
        hi: {
          ...values.hi,
          options: [
            ...values.hi.options,
            { id, value: "", isCorrectAnswer: false },
          ],
        },
      });
    } else {
      if (optionsCount > 1) {
        // Don't allow to decrement below 1 as there has to be at least 1 option
        setOptionsCount((prev) => prev - 1);
        setValues({
          ...values,
          en: {
            ...values.en,
            options: values.en.options.slice(0, optionsCount - 1),
          },
          hi: {
            ...values.hi,
            options: values.hi.options.slice(0, optionsCount - 1),
          },
        });
      }
    }
  }

  function handleChangeAnswerType(e: any) {
    setValues({
      ...values,
      en: {
        ...values.en,
        options: values.en.options.map((option: any) => ({
          ...option,
          isCorrectAnswer: false,
        })),
      },
      hi: {
        ...values.hi,
        options: values.hi.options.map((option: any) => ({
          ...option,
          isCorrectAnswer: false,
        })),
      },
    });
    setAnswerType(e.target.value);
  }

  function handleChangeCorrectAnswer(e: any, optionIdx: number) {
    setValues({
      ...values,
      en: {
        ...values.en,
        options: values.en.options.map(
          (option: any, i: number) =>
            i === optionIdx
              ? { ...option, isCorrectAnswer: e.target.checked }
              : answerType === "single"
              ? { ...option, isCorrectAnswer: false } // Setting other values to false in case of single correct
              : option // nothing happens with multiple correct
        ),
      },
      hi: {
        ...values.hi,
        options: values.hi.options.map(
          (option: any, i: number) =>
            i === optionIdx
              ? { ...option, isCorrectAnswer: e.target.checked }
              : answerType === "single"
              ? { ...option, isCorrectAnswer: false } // Setting other values to false in case of single correct
              : option // nothing happens with multiple correct
        ),
      },
    });
  }

  function handleChangeEditor(id: string, value: string, index?: number) {
    if (id === "question" || id === "solution") {
      setValues({
        ...values,
        [currentLanguage]: {
          ...values[currentLanguage],
          [id]: value,
        },
      });
      return;
    }

    setValues({
      ...values,
      [currentLanguage]: {
        ...values[currentLanguage],
        options: values[currentLanguage].options.map((option: any, i: number) =>
          i === index ? { ...option, value } : option
        ),
      },
    });
  }

  return (
    <div className={styles.question}>
      <p>Question {idx}</p>
      <div className={styles.tabsContainer}>
        <Tabs
          value={tab}
          onChange={handleChangeTab}
          variant="scrollable"
          scrollButtons="auto"
          className={styles.tabs}
          sx={{
            [`& .${tabsClasses.scrollButtons}`]: {
              "&.Mui-disabled": { opacity: 0.3 },
            },
            ".css-1h9z7r5-MuiButtonBase-root-MuiTab-root.Mui-selected": {
              backgroundColor: "#f5f5f5",
              borderRadius: "5px",
            },
            ".css-1aquho2-MuiTabs-indicator": {
              display: "none",
            },
          }}
        >
          <Tab label="Question" />
          {Array(optionsCount)
            .fill(0)
            .map((_, index) => (
              <Tab
                label={`Option ${String.fromCharCode(65 + index)}`}
                key={index}
                className={
                  values[currentLanguage].options[index].isCorrectAnswer
                    ? styles.correctAnswer
                    : ""
                }
              />
            ))}
          <Tab label="Solution" />
        </Tabs>
        <div className={styles.optionsCounter}>
          <IconButton onClick={() => handleChaneOptionsCount("decrement")}>
            -
          </IconButton>
          <span className={styles.count}>{optionsCount}</span>
          <IconButton onClick={() => handleChaneOptionsCount("increment")}>
            +
          </IconButton>
        </div>
      </div>

      <TabPanel value={tab} index={0}>
        <div className={styles.editor}>
          <ReactQuill
            theme="snow"
            value={values[currentLanguage].question}
            onChange={(val: string) => handleChangeEditor("question", val)}
            modules={modules}
            formats={formats}
            bounds={styles.editor}
          />
        </div>
      </TabPanel>
      {values[currentLanguage].options.map((_: any, index: number) => (
        <TabPanel value={tab} index={index + 1} key={index}>
          <div className={styles.editor}>
            <ReactQuill
              theme="snow"
              value={values[currentLanguage].options[index].value}
              onChange={(val: string) =>
                handleChangeEditor("option", val, index)
              }
              modules={modules}
              formats={formats}
              bounds={styles.editor}
            />
          </div>
        </TabPanel>
      ))}
      <TabPanel value={tab} index={values[currentLanguage].options.length + 1}>
        <div className={styles.editor}>
          <ReactQuill
            theme="snow"
            value={values[currentLanguage].solution}
            onChange={(val: string) => handleChangeEditor("solution", val)}
            modules={modules}
            formats={formats}
            bounds={styles.editor}
          />
        </div>
      </TabPanel>
      <div className={styles.actions}>
        <RadioGroup
          row
          aria-labelledby="answer-type"
          name="answer-type-radio-group"
          value={answerType}
        >
          <FormControlLabel
            value="single"
            control={<Radio />}
            label="Single Correct"
            onChange={handleChangeAnswerType}
          />
          <FormControlLabel
            value="multiple"
            control={<Radio />}
            label="Multiple Correct"
            onChange={handleChangeAnswerType}
          />
        </RadioGroup>
        <div className={styles.correctAnswers}>
          <FormGroup row>
            {values[currentLanguage].options.map((option: any, i: number) => (
              <FormControlLabel
                control={answerType === "single" ? <Radio /> : <Checkbox />}
                label={String.fromCharCode(65 + i)} // Using ASCII for generating characters through index
                key={i}
                checked={option.isCorrectAnswer}
                onChange={(e: any) => handleChangeCorrectAnswer(e, i)}
              />
            ))}
          </FormGroup>
        </div>
      </div>
    </div>
  );
};
