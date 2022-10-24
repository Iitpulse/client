import styles from "./Result.module.scss";
import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
  Button,
  Sidebar,
  NotificationCard,
  Navigate,
  Card,
} from "../../components";
import { CircularProgress as MUICircularProgress, styled } from "@mui/material";
import timer from "../../assets/icons/timer.svg";
import { API_TESTS } from "../../utils/api";
import {
  DetailedAnalysis,
  HeaderDetails,
} from "../DetailedAnalysis/DetailedAnalysis";

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
  const [finalTest, setFinalTest] = useState<any>({});
  const [finalSections, setFinalSections] = useState<any>([]);
  const navigate = useNavigate();

  const { testName, testExamName } = useParams();

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

  useEffect(() => {
    async function getTest() {
      const test = tests.filter((item) => item.id.toString() === testId);
      setCurrentTest(test);
    }
    async function getResult() {
      const res = await API_TESTS().get(`/test/result/student`, {
        params: {
          testId,
        },
      });
      setFinalTest(res.data);
    }
    // getTest();
    getResult();
  }, [testId]);

  /*
    Listen to all the changes finalTest obj
  */
  useEffect(() => {
    if (finalTest?.id || finalTest?._id) {
      const { totalMarks, totalTimeTakenInSeconds } = finalTest;
      let totalCorrect = 0;
      let totalAttempted = 0;
      let totalQuestions = 0;
      let totalIncorrect = 0;

      finalTest.sections.forEach((section: any) => {
        totalQuestions += section.totalQuestions;
        let attempted = 0;
        let correct = 0;
        let incorrect = 0;
        let timeTakenInSeconds = 0;
        let marks = 0;

        section.subSections?.forEach((subSection: any) => {
          Object.values(subSection?.questions)?.forEach((question: any) => {
            const { timeTakenInSeconds: qTimeTakenInSeconds } = question;

            // if not null -> Question is attempted
            if (qTimeTakenInSeconds !== null) {
              attempted += 1;
              totalAttempted += 1;
              marks += question.marks;
              if (question.marks < 0 && question.wrongAnswers.length) {
                incorrect += 1;
                timeTakenInSeconds += qTimeTakenInSeconds;
                totalIncorrect += 1;
              } else if (question.marks > 0 && question.correctAnswers.length) {
                correct += 1;
                totalCorrect += 1;
                timeTakenInSeconds += qTimeTakenInSeconds;
              }
            }
            setFinalSections((prev: any) => ({
              ...prev,
              [section.id]: {
                ...section,
                attempted,
                correct,
                incorrect,
                timeTakenInSeconds,
                marks,
              },
            }));
          });
        });
      });
      setHeaderData({
        totalMarks,
        totalTimeTakenInSeconds,
        totalCorrect,
        totalAttempted,
        totalQuestions,
        totalIncorrect,
      });
    }
  }, [finalTest]);

  return (
    <div className={styles.container}>
      <Navigate path={"/test"}>Back To Tests</Navigate>
      <HeaderDetails
        name={testName || ""}
        type={finalTest?.type || ""}
        languages={[{ name: "English" }, { name: "Hindi" }]}
        duration={finalTest?.duration || 90}
        totalAppeared={finalTest?.totalAppeared || 0}
        highestMarks={finalTest?.highestMarks || 0}
        lowestMarks={finalTest?.lowestMarks || 0}
        averageMarks={finalTest?.averageMarks || 0}
        status={finalTest?.status || ""}
        scheduledFor={finalTest?.scheduledFor || []}
      />
      <div className={styles.content}>
        {/* <div className={styles.top}>
          <h2>
            {testName || ""} ({testExamName || "NA"})
          </h2>
          <div className={styles.status}>
            {currentTest?.status}{" "}
            <div
              className={styles.statusColor}
              style={{ backgroundColor: getStatusColor(currentTest?.status) }}
            ></div>{" "}
          </div>
        </div> */}

        {/* <div className={styles.basicInfo}>
          <h3 className={styles.marksObtained}>
            Marks Obtained :{" "}
            <span className={styles.boldLarge}>
              {headerData?.totalMarks || 0}/{headerData?.totalTestMarks || 0}
            </span>
          </h3>
          <h3 className={styles.totalAttempted}>
            Attempted :{" "}
            <span className={styles.boldLarge}>
              {headerData?.totalAttempted || 0}/
              {headerData?.totalQuestions || 0}
            </span>{" "}
          </h3>
        </div> */}
        <Card classes={[styles.basicInfo]}>
          <h3 className={styles.marksObtained}>
            Marks Obtained :{" "}
            <span className={styles.boldLarge}>
              {headerData?.totalMarks || 0}/{headerData?.totalTestMarks || 0}
            </span>
          </h3>
          <h3 className={styles.totalAttempted}>
            Attempted :{" "}
            <span className={styles.boldLarge}>
              {headerData?.totalAttempted || 0}/
              {headerData?.totalQuestions || 0}
            </span>{" "}
          </h3>
        </Card>
        <div className={styles.cards}>
          {Object.values(finalSections)?.map((item: any, index: number) => (
            <SubjectCard key={item.id} color={colors[index % 4]} {...item} />
          ))}
        </div>
        <Button
          onClick={() =>
            navigate(
              `/test/result/detailed-analysis/${testName}/${testExamName}/${testId}`
            )
          }
          color="primary"
        >
          View Detailed Analysis
        </Button>
        <DetailedAnalysis sections={Object.values(finalSections)} />
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
              description="New student joined IIT Pulse Anurag Pal - Dropper Batch"
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
  marks: number;
  maxMarks: number;
  attempted: number;
  correct: number;
  incorrect: number;
  maxTime: string;
  timeTakenInSeconds: number;
  totalQuestions: number;
}

const SubjectCard: React.FC<ISubjectCard> = ({
  color,
  name,
  marks,
  attempted,
  correct,
  incorrect,
  timeTakenInSeconds,
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
            {marks}/{360}
          </h2>
          <div className={styles.time}>
            <img src={timer} alt="Time" />
            <p>{timeTakenInSeconds.toFixed(2)}</p>
          </div>
          <p className={styles.accuracy}>
            Accuracy:
            <span className={styles.highlight}>
              {roundToOne((correct / attempted) * 100)}%
            </span>
          </p>
        </div>
        <CircularProgress color={color} progress={(marks / 360) * 100} />
      </div>
      <div className={styles.moreInfo}>
        <p>
          Attempted :<span className={styles.highlight}>{attempted}</span>{" "}
        </p>
        <p>
          Correct :<span className={styles.highlight}>{correct}</span>{" "}
        </p>
        <p>
          Incorrect :<span className={styles.highlight}>{incorrect}</span>{" "}
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
