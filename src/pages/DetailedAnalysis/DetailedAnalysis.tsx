import styles from "./DetailedAnalysis.module.scss";
import { useParams } from "react-router";
import { Button, Sidebar, NotificationCard, Navigate } from "../../components/";
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

const results = [
  {
    id: 1,
    testId: 1,
    name: "Sample Test",
    exam: { fullName: "JEE MAINS" },
    createdAt: "22/01/2032",
    status: "Ongoing",
    type: "Part Syllabus",
    duration: 180,
    scheduledFor: [
      "11 Jan 9:00 AM - 12:00 PM",
      "13 Jan 10:00 AM - 1:00 PM",
      "13 Jan 2:00 PM - 5:00 PM",
    ],
    maxMarks: 360,
    highestMarks: 233,
    totalQuestions: 90,
    totalStudentAppeared: 393,
    averageMarks: 148.2,
    averagePercentageAccuracy: 56.8,
    languages: [
      { id: "abc123", name: "English" },
      { id: "abc456", name: "Hindi" },
    ],
  },
];

const DetailedAnalysis = () => {
  const { testId } = useParams();
  const [tab, setTab] = useState(0);

  const [currentResult, setCurrentResult] = useState<any>({});
  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }
  function getResultInformation(testId: string | undefined) {
    const [test] = results.filter((item) => item.id.toString() === testId);

    setCurrentResult(test);
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
    getResultInformation(testId);
  }, [testId]);

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
            <Tab label="Physics" />
            <Tab label="Chemistry" />
            <Tab label="Mathematics" />
          </Tabs>
          <TabPanel value={tab} index={0}>
            <div className={styles.questions}>
              <Question />
            </div>
          </TabPanel>
        </div>
      </div>
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
  // id:string,
  // description:string,
  // correctAnswer:string,
  // solution?:string ,
  // options:OptionProp[]
}
const Question = (props: QuestionProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <div className={styles.question}>
      <div className={styles.left}>
        <h5>
          1.) Lorem ipsum dolor sit amet consectetur adipisicing elit. Eaque qui
          accusamus pariatur fugit quod reprehenderit ut non recusandae
          reiciendis, doloremque dolor alias quis sunt, deserunt accusantium
          praesentium? Fuga minus ipsa amet obcaecati nesciunt qui. Nulla libero
          quibusdam itaque iure exercitationem.
        </h5>
        <img src="" alt="Some Question Img" />
        <div className={styles.options}>
          <p>A. Option A</p>
          <p>B. Option B</p>
          <p>C. Option C</p>
          <p>D. Option D</p>
        </div>
      </div>
      <div className={styles.right}>
        <IconButton
          id="basic-button"
          aria-controls={open ? "basic-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={handleClick}
        >
          <img src={kebabMenu} alt="Kebab Menu" />
        </IconButton>
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
          <p>Time Taken : 130s</p>
          <p>Average Time Taken : 150s</p>
          <p>Quickest Response : 10s</p>
          <p>Attempted By : 65.3%</p>
        </div>
        <div className={styles.optionPercentageWrapper}>
          <div className={styles.optionPercentageContainer}>
            <h5>A</h5>
            <div className={styles.optionPercentage}> </div>
            <p>55%</p>
          </div>
          <div className={styles.optionPercentageContainer}>
            <h5>B</h5>
            <div className={styles.optionPercentage}> </div>
            <p>100%</p>
          </div>
          <div className={styles.optionPercentageContainer}>
            <h5>C</h5>
            <div className={styles.optionPercentage}> </div>
            <p>20%</p>
          </div>
          <div className={styles.optionPercentageContainer}>
            <h5>D</h5>
            <div className={styles.optionPercentage}> </div>
            <p>10%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DetailedAnalysis;
