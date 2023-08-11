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
import { Segmented } from "antd";

interface Props {
  setData: (data: any) => void;
  data?: any;
  isInitialValuePassed: boolean;
  setIsInitialValuePassed?: (value: boolean) => void;
  subject: string;
  chapters: Array<any>;
  topics: Array<any>;
  difficulty: string;
  isSubmitting?: boolean;
  isStable: boolean;
  setIsStable: (value: boolean) => void;
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
  isSubmitting,
  isStable,
  setIsStable,
}) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [paragraph, setParagraph] = useState(
    isInitialValuePassed ? data?.paragraph : ""
  );
  const [questions, setQuestions] = useState<Array<any>>(
    isInitialValuePassed ? data?.questions : []
  );
  console.log(isInitialValuePassed, { data }, data?.questions, questions);

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
      setQuestions(
        questions.length > 1
          ? questions.slice(0, questions.length - 1)
          : questions
      );
    }
  }

  // useEffect(() => {
  //   setIsStable(true);
  //   return () => {
  //     setIsStable(false);
  //   };
  // });

  // useEffect(() => {
  //   console.log({ isStable });
  // });

  function handleChangeData(values: any, idx: number) {
    console.log({ values, idx });
    setQuestions((prev) =>
      prev.map((question, i) => (i === idx ? values : question))
    );
  }

  useEffect(() => {
    setData((prev: any) => {
      console.log(prev);
      return { ...prev, paragraph, questions, type: "paragraph" };
    });
    // console.log({ yohohoyohoho: "sdfs", questions });
  }, [questions]);

  // useEffect(() => {
  //   if (!isInitialValuePassed) {
  //     if (data?._id) {
  //       // console.log("YOHO", { data });
  //       setData({
  //         paragraph: data?.paragraph,
  //         questions: data?.questions,
  //         type: "paragraph",
  //       });
  //       setQuestions(data?.questions);
  //       // console.log({ questionsHola: data?.questions });
  //       setParagraph(data?.paragraph);
  //       //@ts-ignore
  //       setIsInitialValuePassed(true);
  //     }
  //   }
  // }, [data, isInitialValuePassed]);

  useEffect(() => {
    console.log({ questions });
  }, [questions]);
  console.log({ questions });
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
              setIsInitialValuePassed={setIsInitialValuePassed}
              isInitialValuePassed={isInitialValuePassed}
              isSubmitting={isSubmitting}
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
  setIsInitialValuePassed?: (value: boolean) => void;
  isSubmitting?: boolean;
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
  setIsInitialValuePassed,
  isSubmitting,
}) => {
  const [type, setType] = useState(
    (data.type === "single" || data.type === "multiple"
      ? "objective"
      : data.type) || "objective"
  );
  console.log({ data });
  const [localData, setLocalData] = useState(
    isInitialValuePassed
      ? data
      : {
          en: {
            question: "",
            options: [],
            solution: "",
          },
          hi: {
            question: "",
            options: [],
            solution: "",
          },
          isProofRead: false,
          id: "",
          type: "objective",
        }
  );
  const [isInitialValuePassedLocal, setIsInitialValuePassedLocal] =
    useState(false);
  const [error, setError] = useState({
    type: false,
  });
  console.log({ data });
  // useEffect(() => {
  //   if (isSubmitting) {
  //     if (type === "") {
  //       setError({ type: true });
  //     }
  //     console.log("isSubmitting", { type, localData }); //yaha tk sahi hai
  //     setData({ ...localData }, idx);
  //   }
  // }, [isSubmitting]);

  useEffect(() => {
    setData(localData, idx);
    console.log(localData, data);
    // if (isInitialValuePassed) {
    //   console.log({ localData, isInitialValuePassed });
    //   setType(
    //     (data.type === "single" || data.type === "multiple"
    //       ? "objective"
    //       : data.type) || "objective"
    //   );
    //   // setIsInitialValuePassedLocal(true);
    // } else {
    //   console.log({ localData, isInitialValuePassed, data });
    //   setData(data, idx);
    //   // console.log({ testingtheType: data.type });
    //   // setIsInitialValuePassedLocal(true);
    // }
  }, [localData]);

  // useEffect(() => {
  //   console.log({
  //     localData,
  //     type,
  //     test:
  //       data.type === "objective" ||
  //       data.type === "multiple" ||
  //       data.type === "single"
  //         ? true
  //         : false,
  //   });
  // });

  // useEffect(() => {
  //   if (type === "objective" && isInitialValuePassedLocal) {
  //     //paas objective template in set data along with idx
  //     // console.log("To Objective");
  //     let tempOptions = generateOptions("single", 4);
  //     setData(
  // {
  //   en: {
  //     question: "",
  //     options: tempOptions,
  //     solution: "",
  //   },
  //   hi: {
  //     question: "",
  //     options: tempOptions,
  //     solution: "",
  //   },
  //   isProofRead: false,
  //   id: "",
  //   type: "objective",
  // },
  //       idx
  //     );
  //   } else if (type === "integer" && isInitialValuePassedLocal) {
  //     //pass integer template in set data along with idx
  //     // console.log("To Integer");
  //     setData(
  //       {
  //         en: {
  //           question: "",
  //           solution: "",
  //         },
  //         hi: {
  //           question: "",
  //           solution: "",
  //         },
  //         isProofRead: false,
  //         id: "",
  //         type: "integer",
  //         correctAnswer: {
  //           from: "",
  //           to: "",
  //         },
  //       },
  //       idx
  //     );
  //   }
  // }, [type]);

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
      {type === "objective" || type === "multiple" || type === "single" ? (
        <Objective
          subject={subject}
          chapters={chapters}
          topics={topics}
          difficulty={difficulty}
          data={data}
          isComingFromParagraph={true}
          setData={setLocalData}
          isInitialValuePassed={isInitialValuePassed}
          setIsInitialValuePassed={setIsInitialValuePassed}
        />
      ) : (
        <Integer
          subject={subject}
          chapters={chapters}
          topics={topics}
          isComingFromParagraph={true}
          difficulty={difficulty}
          data={data}
          setData={setLocalData}
          isInitialValuePassed={isInitialValuePassed}
          setIsInitialValuePassed={setIsInitialValuePassed}
        />
      )}
      <br />
      <hr />
      <br />
    </div>
  );
};
