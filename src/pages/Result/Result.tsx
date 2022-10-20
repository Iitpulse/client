import styles from "./Result.module.scss";
import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Button, Sidebar, NotificationCard, Navigate } from "../../components";
import { CircularProgress as MUICircularProgress, styled } from "@mui/material";
import timer from "../../assets/icons/timer.svg";
import { API_TESTS } from "../../utils/api";

const tests = [
  {
    id: 1,
    name: "Sample Test",
    exam: { fullName: "JEE MAINS" },
    createdAt: "22/01/2032",
    status: "Ongoing",
  },
];
const tempResult = {
  testId: 1,
  subjects: [
    {
      name: "Physics",
      marksObtained: 48,
      maxMarks: 120,
      totalQuestions: 30,
      attempted: 17,
      correct: 13,
      maxTime: "1:00:00",
    },
    {
      name: "Chemistry",
      marksObtained: 75,
      maxMarks: 120,
      totalQuestions: 30,
      attempted: 25,
      correct: 20,
      maxTime: "1:00:00",
    },
    {
      name: "Maths",
      marksObtained: 110,
      totalQuestions: 30,
      maxMarks: 120,
      attempted: 23,
      correct: 21,
      maxTime: "1:00:00",
    },
  ],
};

const colors = ["#55bc7e", "#f8ba1c", "#fc5f5f", "#61b4f1"];
function roundToOne(num: number) {
  return Number(num).toFixed(1);
}
const Result = () => {
  const { testId } = useParams();
  const [headerData, setHeaderData] = useState<any>({} as any);
  const [currentTest, setCurrentTest] = useState<any>({});
  const navigate = useNavigate();

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
  function getResult() {
    return tempResult;
  }

  useEffect(() => {
    async function getTest() {
      const test = tests.filter((item) => item.id.toString() === testId);
      setCurrentTest(test);
    }
    async function getResult() {
      const res = API_TESTS().get("/result/student", {
        params: {
          testId,
        },
      });
      console.log({ res });
    }
    getTest();
    getResult();
  }, [testId]);

  return (
    <div className={styles.container}>
      <Navigate path={"/test"}>Back To Tests</Navigate>
      <div className={styles.content}>
        <div className={styles.top}>
          <h2>
            {currentTest?.name} ({currentTest?.exam?.fullName})
          </h2>
          <div className={styles.status}>
            {currentTest?.status}{" "}
            <div
              className={styles.statusColor}
              style={{ backgroundColor: getStatusColor(currentTest?.status) }}
            ></div>{" "}
          </div>
        </div>

        <div className={styles.basicInfo}>
          <h3 className={styles.marksObtained}>
            Marks Obtained :{" "}
            <span className={styles.boldLarge}>
              {tempResult?.subjects.reduce((acc: number, item: any) => {
                acc += item.marksObtained;
                return acc;
              }, 0)}
              /
              {tempResult?.subjects.reduce((acc: number, item: any) => {
                acc += item.maxMarks;
                return acc;
              }, 0)}
            </span>
          </h3>
          <h3 className={styles.totalAttempted}>
            Attempted :{" "}
            <span className={styles.boldLarge}>
              {tempResult?.subjects.reduce((acc: number, item: any) => {
                acc += item.attempted;
                return acc;
              }, 0)}
            </span>{" "}
          </h3>
        </div>
        <div className={styles.cards}>
          {tempResult?.subjects?.map((item: any, index: number) => (
            <SubjectCard color={colors[index % 4]} {...item} />
          ))}
        </div>
        <Button
          onClick={() => navigate("/test/result/detailed-analysis/" + testId)}
          color="primary"
        >
          View Detailed Analysis
        </Button>
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

interface ISubjectCard {
  color: string;
  name: string;
  marksObtained: number;
  maxMarks: number;
  attempted: number;
  correct: number;
  maxTime: string;
  totalQuestions: number;
}

const SubjectCard: React.FC<ISubjectCard> = ({
  color,
  name,
  marksObtained,
  maxMarks,
  attempted,
  correct,
  maxTime,
  totalQuestions,
}) => {
  return (
    <div className={styles.subjectCard}>
      <h3 style={{ color }} className={styles.subjectName}>
        {name}
      </h3>
      <div className={styles.mid}>
        <div className={styles.left}>
          <h2 className={styles.marks}>
            {marksObtained}/{maxMarks}
          </h2>
          <div className={styles.time}>
            <img src={timer} alt="Time" />
            <p>{maxTime}</p>
          </div>
          <p className={styles.accuracy}>
            Accuracy:
            <span className={styles.highlight}>
              {roundToOne((correct / attempted) * 100)}%
            </span>
          </p>
        </div>
        <CircularProgress
          color={color}
          progress={(marksObtained / maxMarks) * 100}
        />
      </div>
      <div className={styles.moreInfo}>
        <p>
          Attempted :<span className={styles.highlight}>{attempted}</span>{" "}
        </p>
        <p>
          Correct :<span className={styles.highlight}>{correct}</span>{" "}
        </p>
        <p>
          Incorrect :
          <span className={styles.highlight}>{attempted - correct}</span>{" "}
        </p>
      </div>
    </div>
  );
};

const CircularProgress: React.FC<{ color: string; progress: number }> = ({
  progress,
  color,
}) => {
  return (
    <div className={styles.circularProgress}>
      <MUICircularProgress
        sx={{ color }}
        variant="determinate"
        value={progress}
      />
      <p className={styles.progress}>{roundToOne(progress)}%</p>
    </div>
  );
};

export default Result;
