import { useEffect, useState } from "react";
import { Button } from "../../../components";
import styles from "./Objective.module.scss";
import ReactQuill from "react-quill";
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
import { TabPanel } from "../Common";

interface Props {
  id: string;
}

const Objective: React.FC<Props> = ({ id }) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [tab, setTab] = useState(0);
  const [optionsCount, setOptionsCount] = useState(4);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [answerType, setAnswerType] = useState<"single" | "multiple">("single");

  const [values, setValues] = useState({
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

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],
      ["link", "image"],
      ["clean"],
      ["formula"], // NOT WORKING YET
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "link",
    "image",
    "formula", // NOT WORKING YET
  ];

  useEffect(() => {
    console.log({ values });
  }, [values]);

  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
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
        options: values[currentLanguage].options.map((option, i) =>
          i === index ? { ...option, value } : option
        ),
      },
    });
  }

  function handleChangeAnswerType(e: any) {
    setValues({
      ...values,
      en: {
        ...values.en,
        options: values.en.options.map((option) => ({
          ...option,
          isCorrectAnswer: false,
        })),
      },
      hi: {
        ...values.hi,
        options: values.hi.options.map((option) => ({
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
          (option, i) =>
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
          (option, i) =>
            i === optionIdx
              ? { ...option, isCorrectAnswer: e.target.checked }
              : answerType === "single"
              ? { ...option, isCorrectAnswer: false } // Setting other values to false in case of single correct
              : option // nothing happens with multiple correct
        ),
      },
    });
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
      if (optionsCount > 0) {
        // Don't allow to decrement below 0
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

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div className={styles.left}>
          <h3>Objective Type Question</h3>
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
          />
        </div>
      </TabPanel>
      {values[currentLanguage].options.map((_, index) => (
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
            {values[currentLanguage].options.map((option, i) => (
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
    </section>
  );
};

export default Objective;
