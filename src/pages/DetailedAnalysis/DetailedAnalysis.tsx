import styles from "./DetailedAnalysis.module.scss";
import { useParams } from "react-router";
import {
  Button,
  Sidebar,
  NotificationCard,
  Navigate,
  Modal,
} from "../../components/";
import { useEffect, useState } from "react";
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

const DetailedAnalysis = () => {
  const { testId } = useParams();
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
    <div className={styles.container}>
      <div className={styles.testDetails}>
        <Navigate path={"/test/result/" + testId}>Back to Result</Navigate>
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
      <Sidebar title="Recent Activity">
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
      </Sidebar>
    </div>
  );
};

interface SubCardProps {
  title: string;
  icon: string;
  content: string;
  variant: "success" | "warning" | "error" | "primary";
}
const SubCard = (props: SubCardProps) => {
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

interface OptionProp {
  id: string;
  value: string;
  selectedBy: 249;
}
interface QuestionProps {
  id: string;
  count: number;
  description: string;
  correctOptionIndex: number;
  solution?: any;
  options: OptionProp[];
  setViewSolQuestionId: (value: string) => void;
  selectedOptionIndex: number;
  attemptedBy?: number;
  quickestResponse?: number;
  averageTimeTaken?: number;
  timeTaken?: number;
  totalStudentAttempted?: number;
}
const Question = (props: QuestionProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const {
    id,
    count,
    description,
    options,
    correctOptionIndex,
    solution,
    setViewSolQuestionId,
    selectedOptionIndex,
    attemptedBy,
    quickestResponse,
    averageTimeTaken,
    timeTaken,
    totalStudentAttempted,
  } = props;
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewSolution = () => {
    setViewSolQuestionId(id);
    handleClose();
  };

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
            {count}.){description}
          </h5>
          <div className={styles.options}>
            {options.map((item: any, index: number) => (
              <p className={getOptionStyles(index)}>
                <span>{["A", "B", "C", "D"][index]}.)</span>
                {item.description}
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
              <p>Time Taken : {timeTaken}s</p>
              <p>Average Time Taken : {averageTimeTaken}s</p>
            </div>
            <div className={styles.rightMI}>
              <p>Quickest Response : {quickestResponse}s</p>
              <p>Attempted By : {attemptedBy}%</p>
            </div>
          </div>
          <div className={styles.optionPercentageWrapper}>
            {options.map((option: any, index: number) => {
              const selectedBy = totalStudentAttempted
                ? roundOffToOneDecimal(
                    (option?.totalStudentSelected / totalStudentAttempted) * 100
                  )
                : 0;
              return (
                <div className={styles.optionPercentageContainer}>
                  <h5>{["A", "B", "C", "D"][index]}</h5>
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
export default DetailedAnalysis;
