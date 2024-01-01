import styles from "./DetailedAnalysis.module.scss";
import { useParams } from "react-router";
import {
  Button,
  Sidebar,
  NotificationCard,
  Navigate,
  Modal,
  Card,
} from "../../components/";
import Question from "./components/Question";
import { Dispatch, memo, SetStateAction, useEffect, useState } from "react";
import { Tab, Tabs, Menu, MenuItem, IconButton } from "@mui/material";
import CircularProgress, {
  circularProgressClasses,
  CircularProgressProps,
} from "@mui/material/CircularProgress";

import { styled } from "@mui/material/styles";
import calendar from "../../assets/icons/calendar.svg";
import yellowFlag from "../../assets/icons/yellowFlag.svg";
import blueUsers from "../../assets/icons/blueUsers.svg";
import redWarning from "../../assets/icons/redWarning.svg";
import greenCrown from "../../assets/icons/greenCrown.svg";
import kebabMenu from "../../assets/icons/kebabMenu.svg";
import clsx from "clsx";
import { style } from "@mui/system";
import { result } from "../../utils/";
import RenderWithLatex from "../../components/RenderWithLatex/RenderWithLatex";
import MainLayout from "../../layouts/MainLayout";
import timer from "../../assets/icons/timer.svg";
import { LeftCircleOutlined, RightCircleOutlined } from "@ant-design/icons";
import { ISection } from "../../utils/interfaces";

// const results = [
//   {
//     id: 1,
//     testId: 1,
//     name: "Sample Test",
//     exam: { fullName: "JEE MAINS" },
//     createdAt: "22/01/2032",
//     status: "Ongoing",
//     type: "Part Syllabus",
//     duration: 180,
//     scheduledFor: [
//       "11 Jan 9:00 AM - 12:00 PM",
//       "13 Jan 10:00 AM - 1:00 PM",
//       "13 Jan 2:00 PM - 5:00 PM",
//     ],
//     maxMarks: 360,
//     highestMarks: 233,
//     totalQuestions: 90,
//     totalStudentAppeared: 393,
//     averageMarks: 148.2,
//     averagePercentageAccuracy: 56.8,
//     languages: [
//       { id: "abc123", name: "English" },
//       { id: "abc456", name: "Hindi" },
//     ],
//   },
// ];

function roundOffToOneDecimal(num: number) {
  return Math.round(num * 10) / 10;
}

const DetailedAnalysisMain = () => {
  const { testId, testName, testExamName } = useParams();
  const [tab, setTab] = useState(0);
  const [viewSolQuestionId, setViewSolQuestionId] = useState("");
  const [isViewSolModalOpen, setIsViewSolModalOpen] = useState(false);

  const [currentResult, setCurrentResult] = useState<any>({});
  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  function getCurrentResult() {
    // const result = results.find((result) => result.id === parseInt(testId));
    setCurrentResult(result);
  }

  function getStatusColor(status: string) {
    if (!status) return;
    switch (status.toLowerCase()) {
      case "ongoing": {
        return "var(--clr-success)";
      }

      default: {
        return "red";
      }
    }
  }
  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }
  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={"tabpanel-" + index}
        {...other}
      >
        {value === index && children}
      </div>
    );
  }

  useEffect(() => {
    viewSolQuestionId
      ? setIsViewSolModalOpen(true)
      : setIsViewSolModalOpen(false);
  }, [viewSolQuestionId]);

  useEffect(() => {
    getCurrentResult();
  }, []);
  console.log({ currentResult });
  return (
    <MainLayout name="Detailed Analysis">
      <div className={styles.container}>
        <div className={styles.testDetails}>
          <Navigate path={`/test/result/${testName}/${testExamName}/${testId}`}>
            Back to Result
          </Navigate>
          <div className={styles.topContainer}>
            <div className={styles.topRow}>
              <div className={styles.left}>
                <h2>{currentResult?.name}</h2>
                <h5>Type : {currentResult?.type}</h5>
                <h5>
                  Language/s :{" "}
                  {currentResult?.languages
                    ?.map((item: any) => {
                      return item?.name;
                    })
                    .join(", ")}
                </h5>
                <h5> Duration(mins) : {currentResult?.duration}</h5>
              </div>
              <div className={styles.right}>
                <img
                  className={styles.calendar}
                  src={calendar}
                  alt="Scheduled For"
                />
                <div className={styles.scheduledFor}>
                  Scheduled For :
                  {currentResult?.scheduledFor?.map(
                    (item: any, index: number) => (
                      <p key={index}>{item}</p>
                    )
                  )}
                </div>
                <div className={styles.status}>
                  {currentResult?.status}{" "}
                  <div
                    className={styles.statusColor}
                    style={{
                      backgroundColor: getStatusColor(currentResult?.status),
                    }}
                  ></div>{" "}
                </div>
              </div>
            </div>
            <div className={styles.moreInfo}>
              <SubCard
                title="Highest Marks"
                content={currentResult?.highestMarks}
                icon={greenCrown}
                variant="success"
              />
              <SubCard
                title="Average Marks"
                content={currentResult?.averageMarks}
                icon={yellowFlag}
                variant="warning"
              />
              <SubCard
                title="Average Accuracy"
                content={currentResult?.averagePercentageAccuracy + "%"}
                icon={redWarning}
                variant="error"
              />
              <SubCard
                title="Total Appeared"
                content={currentResult?.totalStudentAppeared}
                icon={blueUsers}
                variant="primary"
              />
            </div>
          </div>
          <div className={styles.sectionWiseAnalysis}>
            <Tabs value={tab} onChange={handleChangeTab}>
              {currentResult?.sections?.map((item: any, index: number) => (
                <Tab label={item?.name} key={index} />
              ))}
              {/* <Tab label="Physics" />
            <Tab label="Chemistry" />
            <Tab label="Mathematics" /> */}
            </Tabs>
            {currentResult?.sections?.map((section: any, index: number) => (
              <TabPanel value={tab} index={index} key={index}>
                {section?.questions?.map(
                  (question: any, questionIndex: number) => (
                    <Question
                      {...question}
                      attemptedBy={roundOffToOneDecimal(
                        (question?.totalStudentAttempted /
                          section?.totalStudentAppeared) *
                          100
                      )}
                      setIsViewSolModalOpen={setIsViewSolModalOpen}
                      setViewSolQuestionId={setViewSolQuestionId}
                      key={questionIndex}
                      count={questionIndex + 1}
                    />
                  )
                )}
              </TabPanel>
            ))}
            {/* <TabPanel value={tab} index={0}>
            <div className={styles.questions}>
              <Question
                description={
                  "Lorem ipsum dolor sit amet consectetur adipisicing elit. Eaque quiaccusamus pariatur fugit quod reprehenderit ut non recusandae reiciendis, doloremque dolor alias quis sunt, deserunt accusantium praesentium? Fuga minus ipsa amet obcaecati nesciunt qui. Nulla libero quibusdam itaque iure exercitationem."
                }
                count={1}
                options={[]}
              />
            </div>
          </TabPanel> */}
          </div>
        </div>

        <Modal
          isOpen={isViewSolModalOpen}
          title="Solution"
          onClose={() => {
            setIsViewSolModalOpen(false);
            setViewSolQuestionId("");
          }}
        >
          Hello{viewSolQuestionId}
        </Modal>
        {/* <Sidebar title="Recent Activity">
        {Array(10)
          .fill(0)
          .map((_, i) => (
            <NotificationCard
              key={i}
              id="aasdadsd"
              status={i % 2 === 0 ? "success" : "warning"}
              title={"New Student Joined-" + i}
              description="New student join IIT Pulse Anurag Pal - Dropper Batch"
              createdAt="10 Jan, 2022"
            />
          ))}
      </Sidebar> */}
      </div>
    </MainLayout>
  );
};
export default DetailedAnalysisMain;

function getStatusColor(status: string) {
  if (!status) return;
  switch (status.toLowerCase()) {
    case "ongoing": {
      return "var(--clr-success)";
    }

    default: {
      return "red";
    }
  }
}

interface IHeaderDetails {
  name: string;
  type: string;
  languages: any[];
  duration: number;
  scheduledFor: string[];
  status: string;
  attempted: number;
  totalQuestions: number;
  totalMarks: number;
  marksObtained: number;
  highestMarks: number;
  averageMarks: number;
  lowestMarks: number;
  totalAppeared: number;
  forStudent: boolean;
}

export const HeaderDetails: React.FC<IHeaderDetails> = ({
  name,
  type,
  languages,
  duration,
  scheduledFor,
  status,
  attempted,
  totalMarks,
  totalQuestions,
  marksObtained,
  highestMarks,
  averageMarks,
  lowestMarks,
  totalAppeared,
  forStudent,
}) => {
  console.log({ marksObtained });
  return (
    <div className={styles.headerContainer}>
      <Card classes={[styles.topContainer]}>
        <div className={styles.topRow}>
          <div className={styles.left}>
            <h2>{name}</h2>
            {/* <h5>Type : {type}</h5> */}
          </div>
          <div className={styles.right}>
            <h5 style={{ marginRight: "1rem" }}>
              {languages
                ?.map((item: any) => {
                  return item?.name;
                })
                .join(", ")}
            </h5>
            |
            <div className={styles.flexRow} style={{ margin: "0 1rem" }}>
              <img src={timer} alt="duration" />
              <h5>{duration} mins</h5>
            </div>
            {/* <img
              className={styles.calendar}
              src={calendar}
              alt="Scheduled For"
            />
            <div className={styles.scheduledFor}>
              Scheduled For :
              {scheduledFor?.map((item: any, index: number) => (
                <p key={index}>{item}</p>
              ))}
            </div>
            <div className={styles.status}>
              {status}{" "}
              <div
                className={styles.statusColor}
                style={{
                  backgroundColor: getStatusColor(status),
                }}
              ></div>{" "}
            </div> */}
          </div>
        </div>
        <div className={styles.moreInfo}>
          <SubCard
            title="Highest Marks"
            content={highestMarks}
            icon={greenCrown}
            variant="success"
          />
          <SubCard
            title="Average Marks"
            content={averageMarks.toFixed(1)}
            icon={yellowFlag}
            variant="warning"
          />
          <SubCard
            title="Lowest Marks"
            content={lowestMarks}
            icon={redWarning}
            variant="error"
          />
          <SubCard
            title="Total Appeared"
            content={totalAppeared}
            icon={blueUsers}
            variant="primary"
          />
        </div>
      </Card>
      {forStudent === true && (
        <Card classes={[styles.marksCard]}>
          <div className={styles.marksObtained}>
            <p>Marks Obtained</p>
            <div>
              <h2>
                {marksObtained}/<span>{totalMarks}</span>
              </h2>
            </div>
          </div>
          <div className={styles.attempted}>
            <p>Attempted</p>
            <div>
              <h2>
                {attempted}/<span>{totalQuestions}</span>
              </h2>
              <div style={{ position: "relative" }}>
                <CircularProgress
                  variant="determinate"
                  sx={{
                    color: (theme) =>
                      theme.palette.grey[
                        theme.palette.mode === "light" ? 200 : 800
                      ],
                  }}
                  size={40}
                  thickness={4}
                  value={100}
                />
                <CircularProgress
                  variant="determinate"
                  sx={{
                    position: "absolute",
                    left: 0,
                    [`& .${circularProgressClasses.circle}`]: {
                      strokeLinecap: "round",
                    },
                  }}
                  size={40}
                  thickness={4}
                  value={Math.floor((attempted / totalQuestions) * 100)}
                />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

interface IDetailedAnalysis {
  sections: Array<any>;
  totalAppeared: number;
}

export const DetailedAnalysis: React.FC<IDetailedAnalysis> = ({
  sections,
  totalAppeared,
}) => {
  const [tab, setTab] = useState(0);
  const [viewSol, setViewSol] = useState("");
  const [isViewSolModalOpen, setIsViewSolModalOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [subIdx, setSubIdx] = useState(0);
  console.log("hello", sections[tab]);
  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }
  useEffect(() => {
    window.scrollBy(0, 50);
  }, []);
  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && children}
      </div>
    );
  }

  useEffect(() => {
    viewSol ? setIsViewSolModalOpen(true) : setIsViewSolModalOpen(false);
  }, [viewSol]);

  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  return (
    <>
      <QuestionPlate
        setSecIdx={setTab}
        secIdx={tab}
        sections={sections}
        setQuestionIndex={setQuestionIndex}
        setSubIdx={setSubIdx}
        questionIndex={questionIndex}
        subIdx={subIdx}
      />
      <Card classes={[styles.sectionWiseAnalysis]}>
        <Tabs value={tab} onChange={handleChangeTab}>
          {sections?.map((item: any, index: number) => (
            <Tab label={item?.name} key={index} />
          ))}
          <div style={{ marginLeft: "auto" }}>
            <IconButton
              onClick={() => {
                if (questionIndex == 0 && subIdx == 0) {
                  setTab(tab - 1);
                  setSubIdx(sections[tab - 1]?.subSections.length - 1);
                  setQuestionIndex(
                    sections[tab - 1]?.subSections[
                      sections[tab - 1]?.subSections.length - 1
                    ]?.questions.length - 1
                  );
                } else if (questionIndex == 0 && subIdx !== 0) {
                  setQuestionIndex(
                    sections[tab]?.subSections[subIdx - 1]?.questions.length - 1
                  );
                  setSubIdx(subIdx - 1);
                } else {
                  setQuestionIndex(questionIndex - 1);
                }
              }}
              disabled={subIdx === 0 && questionIndex === 0 && tab === 0}
            >
              <LeftCircleOutlined className={styles.stepIcon} />
            </IconButton>
            <IconButton
              onClick={() => {
                if (
                  questionIndex + 1 ===
                    sections[tab]?.subSections[subIdx]?.questions.length &&
                  subIdx + 1 === sections[tab]?.subSections.length &&
                  tab + 1 !== sections.length
                ) {
                  setQuestionIndex(0);
                  setSubIdx(0);
                  setTab(tab + 1);
                } else if (
                  questionIndex + 1 ===
                    sections[tab]?.subSections[subIdx]?.questions.length &&
                  subIdx + 1 !== sections[tab]?.subSections.length
                ) {
                  setQuestionIndex(0);
                  setSubIdx(subIdx + 1);
                } else {
                  setQuestionIndex(questionIndex + 1);
                }
              }}
              disabled={
                subIdx === sections[tab]?.subSections.length - 1 &&
                questionIndex ===
                  sections[tab]?.subSections[subIdx]?.questions.length - 1 &&
                tab === sections.length - 1
              }
            >
              <RightCircleOutlined className={styles.stepIcon} />
            </IconButton>
          </div>
        </Tabs>
        {sections?.map((section: any, index: number) => (
          <TabPanel value={tab} index={index} key={index}>
            <SubSection
              totalAppeared={totalAppeared}
              subSection={section?.subSections[subIdx]}
              setIsViewSolModalOpen={setIsViewSolModalOpen}
              setViewSol={setViewSol}
              key={subIdx}
              questionIndex={questionIndex}
            />
          </TabPanel>
        ))}
      </Card>

      {/* <Modal
        isOpen={isViewSolModalOpen}
        title="Solution"
        onClose={() => {
          setIsViewSolModalOpen(false);
          setViewSol("");
        }}
      >
        <RenderWithLatex quillString={viewSol} />
      </Modal> */}
    </>
  );
};

const QuestionPlate = ({
  sections,
  setQuestionIndex,
  setSubIdx,
  questionIndex,
  subIdx,
  secIdx,
  setSecIdx,
}: {
  sections: Array<ISection>;
  setQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
  setSubIdx: React.Dispatch<React.SetStateAction<number>>;
  setSecIdx: React.Dispatch<React.SetStateAction<number>>;
  questionIndex?: number;
  subIdx?: number;
  secIdx?: number;
}) => {
  let num = 0;
  console.log({ questionPlate: sections });
  return (
    <div className={styles.questionPlate}>
      {sections?.map((section: ISection, sidx: number) => {
        return section?.subSections?.map((subsection: any, idx: number) => {
          return subsection?.questions?.map((question: any, index: number) => {
            num++;
            return (
              <div
                onClick={() => {
                  setQuestionIndex(index);
                  setSubIdx(idx);
                  setSecIdx(sidx);
                }}
                style={{
                  backgroundColor:
                    questionIndex === index && subIdx === idx && secIdx === sidx
                      ? "#61b4f1"
                      : "transparent",
                  color:
                    questionIndex === index && subIdx === idx && secIdx === sidx
                      ? "white"
                      : "black",
                }}
              >
                {num}
              </div>
            );
          });
        });
      })}
    </div>
  );
};

interface SubCardProps {
  title: string;
  icon: string;
  content: string | number;
  variant: "success" | "warning" | "error" | "primary";
}
export const SubCard = (props: SubCardProps) => {
  const { title, content, variant, icon } = props;
  function getVariantClass(
    variant: "success" | "warning" | "error" | "primary"
  ) {
    switch (variant) {
      case "success":
        return styles.successCard;
      case "warning":
        return styles.warningCard;
      case "error":
        return styles.errorCard;
      case "primary":
        return styles.primaryCard;
      default:
        return styles.primaryCard;
    }
  }
  return (
    <div className={clsx(styles.wrapper, getVariantClass(variant))}>
      <div className={styles.content}>
        <p>{title}</p>
        <h4>{content}</h4>
      </div>
      <img src={icon} alt="Icon" className={styles.icon} />
    </div>
  );
};

interface ISubSection {
  subSection: any;
  setIsViewSolModalOpen: Dispatch<SetStateAction<boolean>>;
  setViewSol: (id: string) => void;
  totalAppeared: number;
  questionIndex: number;
}

const SubSection: React.FC<ISubSection> = ({
  subSection,
  setIsViewSolModalOpen,
  setViewSol,
  totalAppeared,
  questionIndex,
}) => {
  console.log({ val: subSection?.questions });
  let question = subSection?.questions[questionIndex];
  return (
    <>
      {/* {console.log(question)} */}
      <Question
        totalAppeared={totalAppeared}
        {...question}
        attemptedBy={2}
        setIsViewSolModalOpen={setIsViewSolModalOpen}
        setViewSol={setViewSol}
        key={question.id}
        count={questionIndex + 1}
        markingScheme={subSection.markingScheme}
      />
    </>
  );
};
