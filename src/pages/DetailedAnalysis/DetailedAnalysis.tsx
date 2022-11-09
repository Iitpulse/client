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
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
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
  highestMarks: number;
  averageMarks: number;
  lowestMarks: number;
  totalAppeared: number;
}

export const HeaderDetails: React.FC<IHeaderDetails> = ({
  name,
  type,
  languages,
  duration,
  scheduledFor,
  status,
  highestMarks,
  averageMarks,
  lowestMarks,
  totalAppeared,
}) => {
  return (
    <Card classes={[styles.topContainer]}>
      <div className={styles.topRow}>
        <div className={styles.left}>
          <h2>{name}</h2>
          <h5>Type : {type}</h5>
          <h5>
            Language/s :{" "}
            {languages
              ?.map((item: any) => {
                return item?.name;
              })
              .join(", ")}
          </h5>
          <h5> Duration(mins) : {duration}</h5>
        </div>
        <div className={styles.right}>
          <img className={styles.calendar} src={calendar} alt="Scheduled For" />
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
          </div>
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
  console.log("hello", sections[tab]);
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
      <Card classes={[styles.sectionWiseAnalysis]}>
        <Tabs value={tab} onChange={handleChangeTab}>
          {sections?.map((item: any, index: number) => (
            <Tab label={item?.name} key={index} />
          ))}
        </Tabs>
        {sections?.map((section: any, index: number) => (
          <TabPanel value={tab} index={index} key={index}>
            {section?.subSections?.map(
              (subSection: any, subsectionIndex: number) => (
                <SubSection
                  totalAppeared={totalAppeared}
                  subSection={subSection}
                  setIsViewSolModalOpen={setIsViewSolModalOpen}
                  setViewSol={setViewSol}
                  key={subsectionIndex}
                />
              )
            )}
          </TabPanel>
        ))}
      </Card>

      <Modal
        isOpen={isViewSolModalOpen}
        title="Solution"
        onClose={() => {
          setIsViewSolModalOpen(false);
          setViewSol("");
        }}
      >
        <RenderWithLatex quillString={viewSol} />
      </Modal>
    </>
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
}

const SubSection: React.FC<ISubSection> = ({
  subSection,
  setIsViewSolModalOpen,
  setViewSol,
  totalAppeared,
}) => {
  return (
    <>
      {Object.values(subSection?.questions)?.map(
        (question: any, questionIndex: number) => (
          <Question
            totalAppeared={totalAppeared}
            {...question}
            attemptedBy={2}
            setIsViewSolModalOpen={setIsViewSolModalOpen}
            setViewSol={setViewSol}
            key={question.id}
            count={questionIndex + 1}
          />
        )
      )}
    </>
  );
};
