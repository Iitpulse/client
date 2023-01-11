import { useEffect, useState } from "react";
import { Button } from "../../../components";
import styles from "./MatrixMatch.module.scss";
import ReactQuill, { Quill } from "react-quill";
import Tabs, { tabsClasses } from "@mui/material/Tabs";
import { TextField, Tab, IconButton, Checkbox } from "@mui/material";
import { styled } from "@mui/system";
import { formats, modules, TabPanel } from "../Common";
// @ts-ignore
import ImageResize from "quill-image-resize-module-react";
import clsx from "clsx";
import { generateOptions } from "../utils";

interface Props {
  setData: (data: any) => void;
}

Quill.register("modules/imageResize", ImageResize);

const MatrixMatch: React.FC<Props> = ({ setData }) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [tab, setTab] = useState(0);
  const [optionsCount, setOptionsCount] = useState(4);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [answerType, setAnswerType] = useState<"single" | "multiple">("single");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

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
    };
  });
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);

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
            { id: Date.now().toString(), value: "", isCorrectAnswer: false },
          ],
        },
        hi: {
          ...values.hi,
          options: [
            ...values.hi.options,
            { id: Date.now().toString(), value: "", isCorrectAnswer: false },
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

  function handleAddRowsCols(type: "row" | "col") {
    if (type === "row") {
      setRows(rows + 1);
    } else {
      setCols(cols + 1);
    }
  }

  function handleRemoveRowsCols(type: "row" | "col") {
    if (type === "row") {
      if (rows > 1) {
        setRows(rows - 1);
      }
    } else if (type === "col") {
      if (cols > 1) {
        setCols(cols - 1);
      }
    }
  }

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div className={styles.left}>
          <h3>Matrix Match Type Question</h3>
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
        <div className={styles.flexRow}>
          <div className={styles.rows}>
            <p>Rows</p>
            <IconButton onClick={() => handleRemoveRowsCols("row")}>
              -
            </IconButton>
            <span>{rows}</span>
            <IconButton onClick={() => handleAddRowsCols("row")}>+</IconButton>
          </div>
          <div className={styles.cols}>
            <p>Columns</p>
            <IconButton onClick={() => handleRemoveRowsCols("col")}>
              -
            </IconButton>
            <span>{cols}</span>
            <IconButton onClick={() => handleAddRowsCols("col")}>+</IconButton>
          </div>
        </div>
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
        {/* <div className={styles.correctAnswers}>
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
      <GenerateMatrix rows={rows} cols={cols} />
      {/* Just for preview */}
      {/* <div dangerouslySetInnerHTML={{ __html: values.en.question }}></div> */}
    </section>
  );
};

export default MatrixMatch;

const GenerateMatrix: React.FC<{ rows: number; cols: number }> = ({
  rows,
  cols,
}) => {
  const [matrix, setMatrix] = useState<any[]>([]);

  useEffect(() => {
    setMatrix(
      Array(rows)
        .fill(0)
        .map(() => Array(cols).fill(0))
    );
  }, [rows, cols]);

  function handleClickCheck(e: any, row: number, col: number) {
    let newMatrix = [...matrix];
    newMatrix[row][col] = e.target.checked;
    setMatrix(newMatrix);
  }

  return (
    <div className={styles.matrix}>
      <div className={styles.colHeader}>
        <span className={clsx(styles.item, styles.rowItem)}></span>
        {Array(cols)
          .fill(0)
          .map((_, i) => (
            <span key={i} className={styles.item}>
              C{i + 1}
            </span>
          ))}
      </div>
      {matrix.map((row: any, i: number) => (
        <div className={styles.row} key={i}>
          <span className={clsx(styles.item, styles.rowItem)}>{`R${
            i + 1
          }`}</span>
          {row.map((col: any, j: number) => (
            <div className={styles.col} key={j}>
              <span className={styles.item}>
                <Checkbox
                  checked={Boolean(matrix[i][j])}
                  onChange={(e: any) => handleClickCheck(e, i, j)}
                />
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
