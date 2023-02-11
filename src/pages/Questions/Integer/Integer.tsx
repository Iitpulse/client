import { useEffect, useState } from "react";
import { Button } from "../../../components";
import styles from "./Integer.module.scss";
import ReactQuill, { Quill } from "react-quill";
import Tabs, { tabsClasses } from "@mui/material/Tabs";
import { TextField, Tab } from "@mui/material";
import { styled } from "@mui/system";
import { formats, modules, TabPanel } from "../Common";
// @ts-ignore
import ImageResize from "quill-image-resize-module-react";
import { getOptionID } from "../utils";

interface Props {
  setData: any;
  data?: any;
  isInitialValuePassed?: boolean;
  setIsInitialValuePassed?: (value: boolean) => void;
  subject: string;
  chapters: Array<any>;
  topics: Array<any>;
  difficulty: string;
  idx?: number;
  isComingFromParagraph?: boolean;
}

Quill.register("modules/imageResize", ImageResize);

const Integer: React.FC<Props> = ({
  setData,
  data,
  isInitialValuePassed,
  setIsInitialValuePassed,
  subject,
  chapters,
  isComingFromParagraph,
  topics,
  difficulty,
  idx,
}) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [tab, setTab] = useState(0);
  // const [optionsCount, setOptionsCount] = useState(4);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [answerType, setAnswerType] = useState<string>("integer");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [values, setValues] = useState({
    en: {
      question: "",
      // options: [
      //   ...Array(optionsCount).fill({
      //     id: Date.now().toString(),
      //     value: "",
      //     isCorrectAnswer: false,
      //   }),
      // ],
      solution: "",
    },
    hi: {
      question: "",
      // options: [
      //   ...Array(optionsCount).fill({
      //     id: Date.now().toString(),
      //     value: "",
      //     isCorrectAnswer: false,
      //   }),
      // ],
      solution: "",
    },
    isProofRead: false,
    id: "",
    type: "",
  });

  useEffect(() => {
    if (isComingFromParagraph) {
      if (isInitialValuePassed) setData(values, idx);
    } else
      setData({
        ...values,
        type: answerType,
        correctAnswer: {
          from,
          to,
        },
      });
  }, [values, setData, answerType, from, to]);

  useEffect(() => {
    if (!isInitialValuePassed) {
      if (data?._id) {
        console.log("YOHO", { data });
        setValues({
          en: {
            question: data?.en?.question,
            solution: data?.en?.solution,
          },
          hi: data.hi,
          isProofRead: data.isProofRead,
          id: data._id ?? "",
          type: data.type,
        });

        setAnswerType(data.type);
        setTo(data?.correctAnswer?.to);
        setFrom(data?.correctAnswer?.from);
        console.log({ test: data });
        //@ts-ignore
        setIsInitialValuePassed(true);
      }
    }
    if (isComingFromParagraph && !isInitialValuePassed) {
      // if (data?._id) {
      console.log("FUCK OFF I WANT TO TEST THIS", { data });

      setValues({
        en: {
          question: data?.en?.question,
          solution: data?.en?.solution,
        },
        hi: data.hi,
        isProofRead: data.isProofRead,
        id: data._id ?? "",
        type: data.type,
      });
      setTo(data?.correctAnswer?.to);
      setFrom(data?.correctAnswer?.from);

      setAnswerType(data.type);

      //@ts-ignore
      setIsInitialValuePassed(true);
      console.log("Ye kya hai phir");
    }
  }, [data, isInitialValuePassed]);

  useEffect(() => {
    console.log({ isInitialValuePassed });
  });

  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  function handleChangeEditor(id: string, value: string, index?: number) {
    console.log({ id, value, index });
    if (id === "question" || id === "solution") {
      console.log({ id, value });
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
        // options: values[currentLanguage].options.map((option, i) =>
        //   i === index ? { ...option, value } : option
        // ),
      },
    });
  }

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div className={styles.left}>
          <h3>Integer Type Question</h3>
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
          {/* {Array(optionsCount)
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
            ))} */}
          <Tab label="Solution" />
        </Tabs>
        {/* <div className={styles.optionsCounter}>
          <IconButton onClick={() => handleChaneOptionsCount("decrement")}>
            -
          </IconButton>
          <span className={styles.count}>{optionsCount}</span>
          <IconButton onClick={() => handleChaneOptionsCount("increment")}>
            +
          </IconButton>
        </div> */}
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
      <TabPanel value={tab} index={1}>
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
        <StyledMUITextField
          id="from"
          label="From"
          value={from}
          type="number"
          onChange={(e: any) => setFrom(e.target.value)}
          variant="outlined"
        />
        <StyledMUITextField
          id="to"
          label="To"
          value={to}
          type="number"
          onChange={(e: any) => setTo(e.target.value)}
          variant="outlined"
        />
        {/* <RadioGroup
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
        </RadioGroup> */}
        {/* <div className={styles.correctAnswer}>
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
        </div> */}
      </div>
      {/* Just for preview */}
      {/* <div dangerouslySetInnerHTML={{ __html: values.en.question }}></div> */}
    </section>
  );
};

const StyledMUITextField = styled(TextField)(() => {
  return {
    minWidth: "250px",
    input: {
      fontSize: "1rem",
      padding: "1.2rem 1.3rem",
    },
    label: {
      fontSize: "1rem",
      maxWidth: "none",
      padding: "0rem 0.5rem",
      backgroundColor: "white",
    },
    ".MuiInputLabel-root.Mui-focused": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
    ".MuiFormLabel-filled": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
  };
});

export default Integer;
