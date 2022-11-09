import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "../../../components";
import styles from "./Objective.module.scss";
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
  Tooltip,
} from "@mui/material";
import { formats, modules, TabPanel } from "../Common";
// @ts-ignore
import ImageResize from "quill-image-resize-module-react";
import { generateOptions, getOptionID } from "../utils";

import { Visibility } from "@mui/icons-material";
import { PreviewHTMLModal } from "../components";

interface Props {
  setData: (data: any) => void;
  data?: any;
  isInitialValuePassed?: boolean;
  setIsInitialValuePassed?: (value: boolean) => void;
}

Quill.register("modules/imageResize", ImageResize);

const Objective: React.FC<Props> = ({
  setData,
  data,
  isInitialValuePassed,
  setIsInitialValuePassed,
}) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [tab, setTab] = useState(0);
  const [optionsCount, setOptionsCount] = useState(4);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [answerType, setAnswerType] = useState<"single" | "multiple">("single");
  const [previewHTML, setPreviewHTML] = useState("");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [fullPreviewModalOpen, setFullPreviewModalOpen] = useState(false);

  const [values, setValues] = useState(() => {
    let tempOptions = generateOptions(answerType, 4);
    return {
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
    };
  });

  useEffect(() => {
    // console.log("hey", data);
    // console.log("hey", values);
    setData((prev: any) => ({ ...values, type: answerType }));
  }, [values, setData, answerType]);

  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  function handleChangeEditor(id: string, value: string, index?: number) {
    if (id === "question" || id === "solution") {
      setValues((prev) => ({
        ...prev,
        [currentLanguage]: {
          ...prev[currentLanguage],
          [id]: value,
        },
      }));
      return;
    }

    setValues((prev) => ({
      ...prev,
      [currentLanguage]: {
        ...prev[currentLanguage],
        options: values[currentLanguage].options.map((option, i) =>
          i === index ? { ...option, value } : option
        ),
      },
    }));
  }

  function handleChangeAnswerType(e: any) {
    setValues((prev) => ({
      ...prev,
      en: {
        ...prev.en,
        options: values.en.options.map((option) => ({
          ...option,
          isCorrectAnswer: false,
        })),
      },
      hi: {
        ...prev.hi,
        options: values.hi.options.map((option) => ({
          ...option,
          isCorrectAnswer: false,
        })),
      },
    }));
    setAnswerType(e.target.value);
  }

  function handleChangeCorrectAnswer(e: any, optionIdx: number) {
    setValues((prev) => ({
      ...prev,
      en: {
        ...prev.en,
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
        ...prev.hi,
        options: values.hi.options.map(
          (option, i) =>
            i === optionIdx
              ? { ...option, isCorrectAnswer: e.target.checked }
              : answerType === "single"
              ? { ...option, isCorrectAnswer: false } // Setting other values to false in case of single correct
              : option // nothing happens with multiple correct
        ),
      },
    }));
  }

  function handleChaneOptionsCount(type: "increment" | "decrement") {
    if (type === "increment") {
      let optionId = getOptionID(answerType, optionsCount + 1);
      setOptionsCount((prev) => prev + 1);
      setValues((prev) => ({
        ...prev,
        en: {
          ...prev.en,
          options: [
            ...prev.en.options,
            { id: optionId, value: "", isCorrectAnswer: false },
          ],
        },
        hi: {
          ...prev.hi,
          options: [
            ...prev.hi.options,
            { id: optionId, value: "", isCorrectAnswer: false },
          ],
        },
      }));
    } else {
      if (optionsCount > 1) {
        // Don't allow to decrement below 1 as there has to be at least 1 option
        setOptionsCount((prev) => prev - 1);
        setValues((prev) => ({
          ...prev,
          en: {
            ...prev.en,
            options: values.en.options.slice(0, optionsCount - 1),
          },
          hi: {
            ...prev.hi,
            options: values.hi.options.slice(0, optionsCount - 1),
          },
        }));
      }
    }
  }

  function handleClickPreview() {
    setPreviewModalOpen(true);
  }
  function handleClickFullPreview() {
    // console.log(values);
    setFullPreviewModalOpen(true);
  }

  function getCurrentHTMLString() {
    const current = values[currentLanguage];

    if (tab > 0 && tab < values[currentLanguage].options.length + 1) {
      return current.options[tab - 1].value;
    }

    switch (tab) {
      case 0:
        return current.question;
      case values[currentLanguage].options.length + 1:
        return current.solution;
      default:
        return "";
    }
  }
  function getCurrentFullPreviewHTMLString() {
    let res =
      values?.en?.question +
      values?.en?.options
        .map(
          (op: any, idx: number) =>
            `<span style='display:flex;justify-content:flex-start;margin:1rem 0;background:${
              op.isCorrectAnswer ? "rgba(85, 188, 126, 0.3)" : "transparent"
            };border-radius:5px;padding:0.4rem 0.6rem;'> ${String.fromCharCode(
              idx + 65
            )}. <span style='margin-left:1rem;'>${op.value}</span></span>`
        )
        .join("");
    // console.log(res);
    return res;
  }

  useEffect(() => {
    if (!isInitialValuePassed) {
      if (data?._id) {
        console.log(
          "SHISHIR",
          { data },
          {
            en: {
              question: data?.en?.question,
              options: data?.en?.options.map((option: any) => ({
                ...option,
                isCorrectAnswer: data?.correctAnswers.includes(option.id),
              })),
              solution: data?.en?.solution,
            },
            hi: data.hi,
            isProofRead: data.isProofRead,
            id: data._id ?? "",
            type: data.type,
          }
        );
        setValues({
          en: {
            question: data?.en?.question,
            options: data?.en?.options.map((option: any) => ({
              ...option,
              isCorrectAnswer: data?.correctAnswers.includes(option.id),
            })),
            solution: data?.en?.solution,
          },
          hi: data.hi,
          isProofRead: data.isProofRead,
          id: data._id ?? "",
          type: data.type,
        });

        setAnswerType(data.type);
        setOptionsCount(data.en.options.length);

        //@ts-ignore
        setIsInitialValuePassed(true);
      }
    }
  }, [data, isInitialValuePassed]);

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
        <div className={styles.flexRow}>
          <Tooltip title="See Preview">
            <IconButton onClick={handleClickPreview}>
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="See Full Preview">
            <IconButton onClick={handleClickFullPreview}>
              <Visibility />
            </IconButton>
          </Tooltip>
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
            bounds={styles.editor}
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
      <PreviewHTMLModal
        showFooter={false}
        isOpen={previewModalOpen}
        previewData={values}
        handleClose={() => setPreviewModalOpen(false)}
        quillString={getCurrentHTMLString()}
        setQuestions={() => {}}
        setPreviewData={() => {}}
      />
      <PreviewHTMLModal
        showFooter={false}
        isOpen={fullPreviewModalOpen}
        previewData={values}
        handleClose={() => setFullPreviewModalOpen(false)}
        quillString={getCurrentFullPreviewHTMLString()}
        setQuestions={() => {}}
        setPreviewData={() => {}}
      />
      {/* Just for preview */}
      {/* <div dangerouslySetInnerHTML={{ __html: previewHTML }}></div> */}
    </section>
  );
};

export default Objective;
