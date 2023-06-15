import { useEffect, useState } from "react";
import { Button } from "../../../components";
import styles from "./Integer.module.scss";
import ReactQuill, { Quill } from "react-quill";
import { TextField, Tab } from "@mui/material";
import { styled } from "@mui/system";
import { formats, modules, TabPanel } from "../Common";
// @ts-ignore
import ImageResize from "quill-image-resize-module-react";
import { getOptionID } from "../utils";
import { Form, InputNumber, Segmented, Tabs } from "antd";

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
        // console.log("YOHO", { data });
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
        // console.log({ test: data });
        //@ts-ignore
        setIsInitialValuePassed(true);
      }
    }
    if (isComingFromParagraph && !isInitialValuePassed) {
      // if (data?._id) {

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
      // console.log("Ye kya hai phir");
    }
  }, [data, isInitialValuePassed]);

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
