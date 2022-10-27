import styles from "./Result.module.scss";
import { useParams, useNavigate } from "react-router";
import { useContext, useEffect, useState } from "react";
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
import GlobalResult from "./components/GlobalResult";
import { AuthContext } from "../../utils/auth/AuthContext";
import { usePermission } from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../utils/constants";
import ResultForStudent from "./ResultForStudent";
import ResultForAdmin from "./ResultForAdmin";
import { message } from "antd";

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
  const [finalTest, setFinalTest] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasResultViewPermission = usePermission(PERMISSIONS.TEST.VIEW_RESULT);

  const { testId, studentId } = useParams();
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function getResult() {
      setError("");
      if (currentUser?.userType === "student" || studentId) {
        setLoading(true);
        try {
          const res = await API_TESTS().get(`/test/result/student`, {
            params: {
              testId,
            },
          });
          setFinalTest(res.data);
        } catch (error: any) {
          console.log("ERROR_FETCH_RESULT", error);
          message.error(error?.response?.data?.message);
          setError(error?.response?.data?.message);
        }
        setLoading(false);
      } else {
        setLoading(true);
        try {
          const res = await API_TESTS().get(`/test/result/admin`, {
            params: {
              testId,
            },
          });
          setFinalTest(res.data);
        } catch (error: any) {
          console.log("ERROR_FETCH_RESULT", error);
          message.error(error?.response?.data?.message);
          setError(error?.response?.data?.message);
        }
        setLoading(false);
      }
    }
    // getTest();
    getResult();
  }, [testId, currentUser, studentId]);

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loading}>
          <MUICircularProgress />
        </div>
      ) : error ? (
        <p>{error}</p>
      ) : !hasResultViewPermission ? (
        <ResultForStudent
          finalTest={finalTest}
          hasResultViewPermission={hasResultViewPermission}
        />
      ) : (
        <ResultForAdmin finalTest={finalTest} />
      )}

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
