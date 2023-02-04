import styles from "../DetailedAnalysis.module.scss";
import { memo, useState } from "react";
import { clsx } from "clsx";
import RenderWithLatex from "../../../components/RenderWithLatex/RenderWithLatex";
import {
  Button,
  Sidebar,
  NotificationCard,
  Navigate,
  Modal,
  Card,
} from "../../../components/";
import { Tab, Tabs, Menu, MenuItem, IconButton } from "@mui/material";
import kebabMenu from "../../../assets/icons/kebabMenu.svg";
import React from "react";

function roundOffToOneDecimal(num: number) {
  return Math.round(num * 10) / 10;
}
interface OptionProp {
  id: string;
  value: string;
  selectedBy: 249;
}

interface QuestionProps {
  id: string;
  count: number;
  en: any;
  hi: any;
  description: string;
  correctOptionIndex: number;
  solution?: any;
  options: OptionProp[];
  setViewSol: (value: string) => void;
  selectedOptionIndex: number;
  attemptedBy?: number;
  quickestResponse?: number;
  averageTimeTakenInSeconds?: number;
  timeTakenInSeconds?: number;
  totalAppeared: number;
  correctAnswersTest: Array<string>;
  selectedOptions: Array<string>;
  // totalStudentAttempted?: number;
}
const Question = (props: QuestionProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const {
    id,
    count,
    en,
    hi,
    options,
    correctOptionIndex,
    solution,
    correctAnswersTest,
    setViewSol,
    selectedOptionIndex,
    selectedOptions,
    attemptedBy,
    quickestResponse,
    averageTimeTakenInSeconds,
    timeTakenInSeconds,
    totalAppeared,
    // totalStudentAttempted,
  } = props;
  //   console.log({ correctAnswersTest });
  let totalStudentAttempted = 0;
  en.options?.forEach((option: any) => {
    totalStudentAttempted += option.attemptedBy;
  });
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewSolution = () => {
    setViewSol(en.solution);
    // handleClose();
  };
  //   console.log({ averageTimeTakenInSeconds });
  function getOptionStyles(index: number) {
    if (selectedOptionIndex === index && correctOptionIndex === index) {
      return clsx(styles.correct, styles.selected, styles.option);
    } else if (selectedOptionIndex === index) {
      return clsx(styles.selected, styles.option);
    } else if (correctOptionIndex === index) {
      return clsx(styles.correct, styles.option);
    } else {
      return clsx(styles.option);
    }
  }
  function getWidthBarStyles(index: number) {
    if (selectedOptionIndex === index && correctOptionIndex === index) {
      return clsx(styles.correct, styles.selected, styles.widthBar);
    } else if (selectedOptionIndex === index) {
      return clsx(styles.selected, styles.widthBar);
    } else if (correctOptionIndex === index) {
      return clsx(styles.correct, styles.widthBar);
    } else {
      return clsx(styles.widthBar);
    }
  }
  return (
    <>
      <div className={styles.question}>
        <div className={styles.left}>
          <h5>
            {count}.&nbsp;
            <RenderWithLatex quillString={en?.question} />
          </h5>
          <div className={styles.options}>
            {en?.options?.map((item: any, index: number) => (
              <p
                className={getOptionStyles(index)}
                style={{
                  backgroundColor: correctAnswersTest.includes(item.id)
                    ? "lightgreen"
                    : "",
                  border: selectedOptions.includes(item.id)
                    ? correctAnswersTest.includes(item.id)
                      ? "1px solid green"
                      : "1px solid red"
                    : "",
                  width: "100%",
                }}
              >
                <span>{String.fromCharCode(65 + index)}.)</span>&nbsp;
                <RenderWithLatex quillString={item.value} />
              </p>
            ))}
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.header}>
            <Button onClick={handleViewSolution} color="success">
              View Full Solution
            </Button>
            <IconButton
              id="basic-button"
              aria-controls={open ? "basic-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
              onClick={handleClick}
            >
              <img src={kebabMenu} alt="Kebab Menu" />
            </IconButton>
          </div>

          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
          >
            <MenuItem onClick={handleClose}>Report a Problem </MenuItem>
          </Menu>
          <div className={styles.moreInfo}>
            <div className={styles.leftMI}>
              <p>Time Taken : {timeTakenInSeconds?.toFixed(2) || 0}s</p>
              <p>
                Average Time Taken :{" "}
                {averageTimeTakenInSeconds?.toFixed(2) || 0}s
              </p>
            </div>
            <div className={styles.rightMI}>
              <p>Quickest Response : {quickestResponse?.toFixed(2) || 0}s</p>
              <p>
                Attempted By :{" "}
                {((totalStudentAttempted / totalAppeared) * 100)?.toFixed(2)}%
              </p>
            </div>
          </div>
          <div className={styles.optionPercentageWrapper}>
            {en?.options?.map((option: any, index: number) => {
              const selectedBy = totalStudentAttempted
                ? roundOffToOneDecimal(
                    (option?.attemptedBy / totalStudentAttempted) * 100
                  )
                : 0;
              return (
                <div className={styles.optionPercentageContainer}>
                  <h5>{String.fromCharCode(65 + index)}</h5>
                  <div className={styles.fullWidth}>
                    <div
                      style={{ width: selectedBy + "%" }}
                      className={getWidthBarStyles(index)}
                    >
                      {" "}
                    </div>
                  </div>
                  <p>{selectedBy}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className={styles.horizontalLine}></div>
    </>
  );
};

export default memo(Question);
