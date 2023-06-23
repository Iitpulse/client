import styles from "../Result.module.scss";
import timerIcon from "../../../assets/icons/timer.svg";
import { CircularProgress as MUICircularProgress } from "@mui/material";
import { roundToOne } from "../../../utils";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card } from "../../../components";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ISubjectCard {
  color: "primary" | "success" | "warning" | "error";
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
  const chartData = {
    labels: ["Correct", "Incorrect", "Unattemped"],
    datasets: [
      {
        label: "# of Votes",
        data: [correct, incorrect, totalQuestions - attempted],
        backgroundColor: ["green", "red", "yellow"],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Card
      classes={[styles.subjectCard, styles[`card_${color}`]]}
      disablePadding
    >
      <div className={styles.header}>
        <h3 className={styles.subjectName}>{name}</h3>
        <div className={styles.mid}>
          <div className={styles.left}>
            <h2 className={styles.marks}>
              {marks}/{360}
            </h2>
            <p className={styles.accuracy}>
              Accuracy:
              <span style={{ color: "black" }}>
                {roundToOne((correct / attempted) * 100)}%
              </span>
            </p>
            <p className={styles.accuracy}>
              {/* <img src={timerIcon} alt="Time" style={{ filter: "invert(1)" }} />
              &nbsp; */}
              Total Time Taken:
              <span style={{ color: "black" }}>
                {timeTakenInSeconds.toFixed(2)}s
              </span>
            </p>
          </div>

          <CircularProgress color={color} progress={(marks / 360) * 100} />
        </div>
      </div>
      <div className={styles.content}>
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
        <div className={styles.pieContainer}>
          <Doughnut
            options={{
              plugins: {
                legend: {
                  display: false,
                },
              },
            }}
            className={styles.pie}
            data={chartData}
          />
        </div>
      </div>
    </Card>
  );
};

export default SubjectCard;

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
