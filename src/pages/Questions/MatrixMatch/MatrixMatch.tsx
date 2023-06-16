import { useEffect, useState } from "react";
import { Button } from "../../../components";
import styles from "./MatrixMatch.module.scss";
import ReactQuill, { Quill } from "react-quill";
import { IconButton } from "@mui/material";
import { styled } from "@mui/system";
import { formats, modules, TabPanel } from "../Common";
// @ts-ignore
import ImageResize from "quill-image-resize-module-react";
import clsx from "clsx";
import { generateOptions } from "../utils";
import { Checkbox, Segmented, Tabs } from "antd";

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

const MatrixMatch: React.FC<Props> = ({ setData }) => {
  const [assertionEnglish, setAssertionEnglish] = useState(false);
  const [assertionHindi, setAssertionHindi] = useState(false);
  const [tab, setTab] = useState(0);
  const [optionsCount, setOptionsCount] = useState(4);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi">("en");
  const [answerType, setAnswerType] = useState<"single" | "multiple">("single");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [matrix, setMatrix] = useState<any[]>([]);

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

  function handleChangeTab(newValue: string) {
    setTab(parseInt(newValue));
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

  useEffect(() => {
    setData((prev: any) => ({ ...prev, correctAnswer: matrix, ...values }));
  }, [matrix, values]);

  useEffect(() => {
    console.log({ values });
  }, [values]);

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
      </div>
      <GenerateMatrix
        rows={rows}
        cols={cols}
        matrix={matrix}
        setMatrix={setMatrix}
      />
      {/* Just for preview */}
      {/* <div dangerouslySetInnerHTML={{ __html: values.en.question }}></div> */}
    </section>
  );
};

export default MatrixMatch;

const GenerateMatrix: React.FC<{
  rows: number;
  cols: number;
  matrix: any;
  setMatrix: (value: any) => void;
}> = ({ rows, cols, matrix, setMatrix }) => {
  useEffect(() => {
    console.log({ matrix });
  });

  useEffect(() => {
    setMatrix(
      Array(rows)
        .fill(0)
        .map(() => Array(cols).fill(false))
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
