import { useEffect, useState } from "react";
import { Button, Sidebar } from "../../../components";
import styles from "./Integer.module.scss";
import ReactQuill, { Quill } from "react-quill";
import { IconButton,TextField, Tab } from "@mui/material";
import { styled } from "@mui/system";
import { formats, modules, TabPanel } from "../Common";
// @ts-ignore
import ImageResize from "quill-image-resize-module-react";
import { getOptionID } from "../utils";
import { Form, InputNumber, Segmented, Tabs } from "antd";
import { Tooltip } from "antd";
import { CheckOutlined, EyeFilled, StarFilled } from "@ant-design/icons";
import { PreviewFullQuestion } from "../Questions";

interface Props {
  setData: (data: any) => void;
  data?: any;
  isInitialValuePassed?: boolean;
  setIsInitialValuePassed?: (value: boolean) => void;
  subject: string;
  chapters: Array<any>;
  topics: Array<any>;
  difficulty: string;
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
}) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [tab, setTab] = useState(0);
  // const [optionsCount, setOptionsCount] = useState(4);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [answerType, setAnswerType] = useState<string>("integer");
  const [from, setFrom] = useState<string>(
    isInitialValuePassed ? data?.correctAnswer?.from : ""
  );
  const [to, setTo] = useState<string>(
    isInitialValuePassed ? data?.correctAnswer?.to : ""
  );
  const [values, setValues] = useState(
    isInitialValuePassed
      ? data
      : {
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
        }
  );
  const [parseInputOpen, setParseInputOpen] = useState(false);
  const [fullPreviewModalOpen, setFullPreviewModalOpen] = useState(false);

  useEffect(() => {
    setData({
      ...values,
      id: data?.id || (Math.random() * 10000).toString(),
      type: answerType,
      correctAnswer: {
        from,
        to,
      },
    });
  }, [values, setData, answerType, from, to]);

  // useEffect(() => {
  //   if (!isInitialValuePassed) {
  //     if (data?._id) {
  //       // console.log("YOHO", { data });
  //       setValues({
  //         en: {
  //           question: data?.en?.question,
  //           solution: data?.en?.solution,
  //         },
  //         hi: data.hi,
  //         isProofRead: data.isProofRead,
  //         id: data._id ?? "",
  //         type: data.type,
  //       });

  //       setAnswerType(data.type);
  //       setTo(data?.correctAnswer?.to);
  //       setFrom(data?.correctAnswer?.from);
  //       // console.log({ test: data });
  //       //@ts-ignore
  //       setIsInitialValuePassed(true);
  //     }
  //   }
  //   if (isComingFromParagraph && !isInitialValuePassed) {
  //     // if (data?._id) {

  //     setValues({
  //       en: {
  //         question: data?.en?.question,
  //         solution: data?.en?.solution,
  //       },
  //       hi: data.hi,
  //       isProofRead: data.isProofRead,
  //       id: data._id ?? "",
  //       type: data.type,
  //     });
  //     setTo(data?.correctAnswer?.to);
  //     setFrom(data?.correctAnswer?.from);

  //     setAnswerType(data.type);

  //     //@ts-ignore
  //     setIsInitialValuePassed(true);
  //     // console.log("Ye kya hai phir");
  //   }
  // }, [data, isInitialValuePassed]);

  // useEffect(() => {
  //   console.log({ isInitialValuePassed });
  // });

  function handleChangeTab(newValue: string) {
    setTab(parseInt(newValue));
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
  function handleClickFullPreview() {
    // console.log(values);
    setFullPreviewModalOpen(true);
  }
  function getCurrentFullPreviewHTMLString() {
    return (
      values?.en?.question +
      values?.en?.options?.map(
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
          items={[
            {
              label: "Question",
              key: "question",
              children: (
                <div className={styles.editor}>
                  <ReactQuill
                    theme="snow"
                    value={values[currentLanguage].question}
                    onChange={(val: string) =>
                      handleChangeEditor("question", val)
                    }
                    modules={modules}
                    formats={formats}
                    bounds={styles.editor}
                  />
                </div>
              ),
            },
            {
              label: "Solution",
              key: "solution",
              children: (
                <div className={styles.editor}>
                  <ReactQuill
                    theme="snow"
                    value={values[currentLanguage].solution}
                    onChange={(val: string) =>
                      handleChangeEditor("solution", val)
                    }
                    modules={modules}
                    formats={formats}
                    bounds={styles.editor}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className={styles.actions}>
        <Form layout="inline">
          <Form.Item label="From">
            <InputNumber
              value={from}
              onChange={(val) => setFrom(val as string)}
            />
          </Form.Item>
          <Form.Item label="To">
            <InputNumber value={to} onChange={(val) => setTo(val as string)} />
          </Form.Item>
        </Form>
      </div>
      <Sidebar
        title="Preview"
        open={fullPreviewModalOpen}
        handleClose={() => setFullPreviewModalOpen(false)}
        width={"40%"}
      >
        {console.log(values)}
        <PreviewFullQuestion
          quillStringQuestion={getCurrentFullPreviewHTMLString()}
          quillStringSolution={values?.correctAnswer?.to}
          previewData={{ ...values, subject, chapters, topics, difficulty }}
          setQuestions={() => {}}
          setPreviewData={() => {}}
          handleClose={() => setFullPreviewModalOpen(false)}
          disableFooter
        />
      </Sidebar>
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
