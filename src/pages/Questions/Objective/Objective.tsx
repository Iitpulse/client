import React, { SetStateAction, useEffect, useRef, useState } from "react";
import { Button, InputField, Modal, Sidebar } from "../../../components";
import styles from "./Objective.module.scss";
import ReactQuill, { Quill } from "react-quill";
import { tabsClasses } from "@mui/material/Tabs";
import { IconButton, TextField } from "@mui/material";
import { formats, modules, TabPanel } from "../Common";
// @ts-ignore
import ImageResize from "quill-image-resize-module-react";
import { extractOptions, generateOptions, getOptionID } from "../utils";

import { AutoFixHigh, Visibility } from "@mui/icons-material";
import { PreviewHTMLModal } from "../components";
import { PreviewFullQuestion } from "../Questions";
import { Checkbox, Radio, Segmented, Tabs, Tooltip } from "antd";
import { CheckOutlined, EyeFilled, StarFilled } from "@ant-design/icons";

interface Props {
  setData: React.Dispatch<React.SetStateAction<any>>;
  data: {
    en: {
      question: string;
      options: Array<any>;
      solution: string;
    };
    hi: {
      question: string;
      options: Array<any>;
      solution: string;
    };
    isProofRead: false;
    id: string;
    type: string;
    correctAnswers: Array<string>;
  };
  isInitialValuePassed?: boolean;
  setIsInitialValuePassed?: (value: boolean) => void;
  subject: string;
  chapters: Array<any>;
  topics: Array<any>;
  difficulty: string;
  isComingFromParagraph?: boolean;
}

Quill.register("modules/imageResize", ImageResize);

const Objective: React.FC<Props> = ({
  setData,
  data,
  isInitialValuePassed,
  setIsInitialValuePassed,
  subject,
  chapters,
  topics,
  isComingFromParagraph,
  difficulty,
}) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [tab, setTab] = useState(0);
  const [optionsCount, setOptionsCount] = useState(4);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [answerType, setAnswerType] = useState<string>(
    isInitialValuePassed ? data.type : "single"
  );
  const [previewHTML, setPreviewHTML] = useState("");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [fullPreviewModalOpen, setFullPreviewModalOpen] = useState(false);
  const [parseInputOpen, setParseInputOpen] = useState(false);
  const [rawInputToBeParsed, setRawInputToBeParsed] = useState("");

  const [values, setValues] = useState(
    isInitialValuePassed
      ? data
      : () => {
          let tempOptions = generateOptions(answerType, 4);
          return {
            correctAnswers: [""],
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
        }
  );

  
  const questionTabItem = {
    label: "Question",
    key: "question",
    children: (
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
    ),
  };

  const solutionTabItem = {
    label: "Solution",
    key: "solution",
    children: (
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
    ),
  };

  const [tabItems, setTabItems] = useState([
    questionTabItem,
    ...values[currentLanguage].options.map((_, index) => ({
      label: (
        <span
          className={
            values[currentLanguage].options[index].isCorrectAnswer
              ? styles.correctAnswer
              : ""
          }
        >
          {values[currentLanguage].options[index].isCorrectAnswer ? (
            <CheckOutlined />
          ) : null}
          {`Option ${String.fromCharCode(65 + index)}`}
        </span>
      ),
      key: `option${index}`,
      children: (
        <div className={styles.editor}>
          <ReactQuill
            theme="snow"
            value={values[currentLanguage].options[index].value}
            onChange={(val: string) => handleChangeEditor("option", val, index)}
            modules={modules}
            formats={formats}
            bounds={styles.editor}
          />
        </div>
      ),
    })),
    solutionTabItem,
  ]);
  useEffect(() => {
    // Initialize isCorrectAnswer based on correctAnswers
    setValues(prev => ({
      ...prev,
      en: {
        ...prev.en,
        options: prev.en.options.map(option => ({
          ...option,
          isCorrectAnswer: prev.correctAnswers.includes(option.id),
        })),
      },
      hi: {
        ...prev.hi,
        options: prev.hi.options.map(option => ({
          ...option,
          isCorrectAnswer: prev.correctAnswers.includes(option.id),
        })),
      },
    }));
  }, []);
  useEffect(() => {
    setTabItems([
      questionTabItem,
      ...values[currentLanguage].options.map((_, index) => ({
        label: (
          <span
            className={
              values[currentLanguage].options[index].isCorrectAnswer
                ? styles.correctAnswer
                : ""
            }
          >
            {values[currentLanguage].options[index].isCorrectAnswer ? (
              <CheckOutlined />
            ) : null}
            {`Option ${String.fromCharCode(65 + index)}`}
          </span>
        ),
        key: `option${index}`,
        children: (
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
        ),
      })),
      solutionTabItem,
    ]);
  }, [values]);

  useEffect(() => {
    console.log("Objective", data);
    console.log("hey", values, answerType);
    setData((prev: any) => ({
      ...values,
      type: answerType,
      id: (Math.random() * 1000).toString(),
    }));
  }, [values, setData, answerType]);

  function handleChangeTab(newValue: string) {
    setTab(parseInt(newValue));
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
      type: e.target.value,
    }));
    setAnswerType(e.target.value);
  }

  function handleChangeCorrectAnswer(newOption: string ) {
    if (Array.isArray(newOption)) {
      setValues((prev) => ({
        ...prev,
        en: {
          ...prev.en,
          options: values.en.options.map((option) => ({
            ...option,
            isCorrectAnswer: newOption.includes(option.id),
          })),
        },
        hi: {
          ...prev.hi,
          options: values.hi.options.map((option) => ({
            ...option,
            isCorrectAnswer: newOption.includes(option.id),
          })),
        },
      }));
      return;
    }
    setValues((prev) => ({
      ...prev,
      en: {
        ...prev.en,
        options: values.en.options.map(
          (option, i) =>
            option.id === newOption
              ? { ...option, isCorrectAnswer: true }
              : { ...option, isCorrectAnswer: false } // Setting other values to false in case of single correct
        ),
      },
      hi: {
        ...prev.hi,
        options: values.hi.options.map(
          (option, i) =>
            option.id === newOption
              ? { ...option, isCorrectAnswer: true }
              : { ...option, isCorrectAnswer: false } // Setting other values to false in case of single correct
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
    return (
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
        .join("")
    );
  }

  // useEffect(() => {
  //   if (!isInitialValuePassed) {
  //     if (data?._id) {
  //       // console.log("YOHO", { data });
  //       setValues({
  //         en: {
  //           question: data?.en?.question,
  //           options: data?.en?.options.map((option: any) => ({
  //             ...option,
  //             isCorrectAnswer: data?.correctAnswers.includes(option.id),
  //           })),
  //           solution: data?.en?.solution,
  //         },
  //         hi: data.hi,
  //         isProofRead: data.isProofRead,
  //         id: data._id ?? "",
  //         type: data.type,
  //       });

  //       setAnswerType(data.type);
  //       setOptionsCount(data.en.options.length);

  //       //@ts-ignore
  //       setIsInitialValuePassed(true);
  //     }
  //   }
  //   if (isComingFromParagraph && !isInitialValuePassed) {
  //     // if (data?._id) {
  //     // console.log("FUCK OFF I WANT TO TEST THIS", { data });
  //     setValues({
  //       en: {
  //         question: data?.en?.question,
  //         options: data?.en?.options.map((option: any) => ({
  //           ...option,
  //           // isCorrectAnswer: data?.correctAnswers.includes(option.id),
  //         })),
  //         solution: data?.en?.solution,
  //       },
  //       hi: data.hi,
  //       isProofRead: data.isProofRead,
  //       id: data._id ?? "",
  //       type: data.type,
  //     });

  //     setAnswerType(data.type);
  //     setOptionsCount(data.en.options.length);

  //     //@ts-ignore
  //     setIsInitialValuePassed(true);
  //   }
  // }, [data, isInitialValuePassed]);

  function handleParseOptions(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let parsed = extractOptions(rawInputToBeParsed);
    let vals = [parsed.a, parsed.b, parsed.c, parsed.d];
    setValues((prev) => ({
      ...prev,
      en: {
        ...prev.en,
        question: parsed.precedingText,
        options: prev.en.options.map((option: any, i: number) => ({
          ...option,
          value: vals[i],
          isCorrectAnswer: false,
        })),
      },
      hi: {
        ...prev.hi,
        options: prev.hi.options.map((option: any, i: number) => ({
          ...option,
          value: vals[i],
          isCorrectAnswer: false,
        })),
      },
    }));
    setOptionsCount(vals.length);
    setParseInputOpen(false);
  }

  function getCorrectAnswerCheckboxOptions() {
    return values[currentLanguage].options.map((option, i) => ({
      label: String.fromCharCode(65 + i),
      value: option.id,
    }));
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
        <div className={styles.flexRow}>
          <Tooltip title="Parse Options">
            <IconButton onClick={() => setParseInputOpen(true)}>
              <StarFilled />
            </IconButton>
          </Tooltip>
          <Tooltip title="See Full Preview">
            <IconButton onClick={handleClickFullPreview}>
              <EyeFilled />
            </IconButton>
          </Tooltip>
          <Segmented
            options={[
              {
                label: "English",
                value: "en",
              },
              {
                label: "Hindi",
                value: "hi",
              },
            ]}
            onChange={(val) =>
              setCurrentLanguage(val.toString() as "en" | "hi")
            }
          />
        </div>
      </div>
      <div className={styles.tabsContainer}>
        <Tabs
          onChange={handleChangeTab}
          type="card"
          className={styles.tabs}
          tabBarExtraContent={{
            right: (
              <div className={styles.optionsCounter}>
                <IconButton
                  onClick={() => handleChaneOptionsCount("decrement")}
                >
                  -
                </IconButton>
                <span className={styles.count}>{optionsCount}</span>
                <IconButton
                  onClick={() => handleChaneOptionsCount("increment")}
                >
                  +
                </IconButton>
              </div>
            ),
          }}
          items={tabItems}
        />
      </div>
      <div className={styles.actions}>
        <Radio.Group onChange={handleChangeAnswerType} value={answerType}>
          <Radio value="single">Single Correct</Radio>
          <Radio value="multiple">Multiple Correct</Radio>
        </Radio.Group>
        <div className={styles.correctAnswers}>
          {/* <FormGroup row>
            {values[currentLanguage].options.map((option, i) => (
              <FormControlLabel
                control={answerType === "single" ? <Radio /> : <Checkbox />}
                label={String.fromCharCode(65 + i)} // Using ASCII for generating characters through index
                key={i}
                checked={option.isCorrectAnswer}
                onChange={(e: any) => handleChangeCorrectAnswer(e, i)}
              />
            ))}
          </FormGroup> */}
          {answerType === "single" ? (
            <Radio.Group
              value={
                values?.correctAnswers?.length > 0
                  ? values?.correctAnswers[0]
                  : values[currentLanguage].options.find(
                      (op) => op.isCorrectAnswer
                    )?.id
              }
              defaultValue={
                values[currentLanguage].options.find((op) => op.isCorrectAnswer)
                  ?.id
              }
              onChange={(e) => handleChangeCorrectAnswer(e.target.value)}
            >
              {values[currentLanguage].options.map((option, i) => {
                console.log({ option });
                return (
                  <Radio
                    value={option.id}
                    key={i}
                    checked={option.isCorrectAnswer}
                    defaultChecked={option.isCorrectAnswer}
                  >
                    {String.fromCharCode(65 + i)}
                  </Radio>
                );
              })}
            </Radio.Group>
          ) : (
            <Checkbox.Group
              value={values[currentLanguage].options
                .filter((op) => op.isCorrectAnswer)
                .map((op) => op.id)}
              options={getCorrectAnswerCheckboxOptions()}
              // @ts-ignore 
              onChange={(newOptions) => handleChangeCorrectAnswer(newOptions)}
            />
          )}
        </div>
      </div>
      {/* <PreviewHTMLModal
        showFooter={false}
        isOpen={previewModalOpen}
        previewData={values}
        handleClose={() => setPreviewModalOpen(false)}
        quillString={getCurrentHTMLString()}
        setQuestions={() => {}}
        setPreviewData={() => {}}
      /> */}
      {/* <PreviewHTMLModal
        showFooter={false}
        isOpen={fullPreviewModalOpen}
        previewData={values}
        handleClose={() => setFullPreviewModalOpen(false)}
        quillString={getCurrentFullPreviewHTMLString()}
        setQuestions={() => {}}
        setPreviewData={() => {}}
      /> */}
      <Sidebar
        title="Preview"
        open={fullPreviewModalOpen}
        handleClose={() => setFullPreviewModalOpen(false)}
        width={"40%"}
      >
        <PreviewFullQuestion
          quillStringQuestion={getCurrentFullPreviewHTMLString()}
          quillStringSolution={values?.en?.solution}
          previewData={{ ...values, subject, chapters, topics, difficulty }}
          setQuestions={() => {}}
          setPreviewData={() => {}}
          handleClose={() => setFullPreviewModalOpen(false)}
          disableFooter
        />
      </Sidebar>
      <Sidebar
        title="Parse Options"
        width="600px"
        open={parseInputOpen}
        handleClose={() => setParseInputOpen(false)}
      >
        <form onSubmit={handleParseOptions} className={styles.rawInputForm}>
          <TextField
            className={styles.rawInput}
            id="raw-input"
            label="Raw Input Value"
            value={rawInputToBeParsed}
            onChange={(e) => setRawInputToBeParsed(e.target.value)}
            type="text"
            variant="outlined"
            multiline
          />
          <Button>Submit</Button>
        </form>
      </Sidebar>
      {/* Just for preview */}
      {/* <div dangerouslySetInnerHTML={{ __html: previewHTML }}></div> */}
    </section>
  );
};

export default Objective;