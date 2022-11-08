import React, { useContext, useEffect, useState } from "react";
import styles from "./Result.module.scss";
import { useNavigate, useParams } from "react-router";
import { Button, Card, CustomTable, Navigate } from "../../components";
import { AuthContext } from "../../utils/auth/AuthContext";
import {
  DetailedAnalysis,
  HeaderDetails,
} from "../DetailedAnalysis/DetailedAnalysis";
import timerIcon from "../../assets/icons/timer.svg";
import { CircularProgress as MUICircularProgress } from "@mui/material";
import MainLayout from "../../layouts/MainLayout";
import { StyledMUISelect } from "../Questions/components";
import SubjectCard from "./components/SubjectCard";

interface Props {
  finalTest: any;
  hasResultViewPermission: boolean;
}

const colors = ["#55bc7e", "#f8ba1c", "#fc5f5f", "#61b4f1"];

const ResultForStudent: React.FC<Props> = ({
  finalTest,
  hasResultViewPermission,
}) => {
  const navigate = useNavigate();

  const { testId, testName, testExamName } = useParams();

  return (
    <MainLayout name="Result > Student">
      <div className={styles.container}>
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
          <StudentResultCore
            finalTest={finalTest}
            hasResultViewPermission={hasResultViewPermission}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default ResultForStudent;

interface PropsStudentResultCore {
  hasResultViewPermission: boolean;
  finalTest: any;
}

export const StudentResultCore: React.FC<PropsStudentResultCore> = ({
  hasResultViewPermission,
  finalTest,
}) => {
  const { currentUser } = useContext(AuthContext);
  const [finalSections, setFinalSections] = useState<any>([]);
  const [headerData, setHeaderData] = useState<any>({} as any);
  const [viewDetailedAnalysis, setViewDetaildAnalysis] = useState(false);
  const [resultType, setResultType] = useState<string>("");

  const { testId, testName, testExamName } = useParams();

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

      finalTest.sections?.forEach((section: any) => {
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

      if (setHeaderData) {
        setHeaderData({
          totalMarks,
          totalTimeTakenInSeconds,
          totalCorrect,
          totalAttempted,
          totalQuestions,
          totalIncorrect,
        });
      }
    }
  }, [finalTest, currentUser]);

  const navigate = useNavigate();

  return (
    <>
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
            {headerData?.totalAttempted || 0}/{headerData?.totalQuestions || 0}
          </span>{" "}
        </h3>
      </Card>
      <div className={styles.cards}>
        {Object.values(finalSections)?.map((item: any, index: number) => (
          <SubjectCard key={item.id} color={colors[index % 4]} {...item} />
        ))}
      </div>
      <div className={styles.detailedBtns}>
        <Button onClick={() => setViewDetaildAnalysis(true)} color="primary">
          View Detailed Analysis
        </Button>
        <StyledMUISelect
          label="Result Type"
          options={[
            {
              name: "Subject Wise",
              value: "subjectWise",
            },
            {
              name: "Question Wise",
              value: "questionWise",
            },
          ]}
          state={resultType}
          onChange={(val) => setResultType(val)}
        />
      </div>
      {(!hasResultViewPermission || viewDetailedAnalysis) &&
        (resultType === "subjectWise" ? (
          <SubjectWiseAnalysis sections={Object.values(finalSections)} />
        ) : (
          <DetailedAnalysis sections={Object.values(finalSections)} />
        ))}
    </>
  );
};

interface SubjectWiseProps {
  sections: Array<any>;
}

const SubjectWiseAnalysis: React.FC<SubjectWiseProps> = ({ sections }) => {
  const [chapters, setChapters] = useState<any>([]);

  useEffect(() => {
    if (sections?.length) {
      let tempChapters: any = {};
      sections.forEach((section: any) => {
        section.subSections.forEach((subSection: any) => {
          subSection.questions.forEach((question: any) => {
            question.chapters.forEach((chapter: any, i: number) => {
              if (tempChapters[chapter.name]) {
                tempChapters[chapter.name].totalQuestions += 1;
                if (question.marks > 0) {
                  tempChapters[chapter.name].correct += 1;
                } else if (question.marks < 0) {
                  tempChapters[chapter.name].incorrect += 1;
                }
                if (question.timeTakenInSeconds !== null) {
                  tempChapters[chapter.name].attempted += 1;
                } else {
                  tempChapters[chapter.name].unattempted += 1;
                }
                tempChapters[chapter.name].marks += question.marks;

                tempChapters[chapter.name].timeTakenInSeconds +=
                  question.timeTakenInSeconds;

                // topics
                chapter.topics.forEach((topic: any) => {
                  if (tempChapters[chapter.name].topics[topic]) {
                    tempChapters[chapter.name].topics[
                      topic
                    ].totalQuestions += 1;
                    if (question.marks > 0) {
                      tempChapters[chapter.name].topics[topic].correct += 1;
                    } else if (question.marks < 0) {
                      tempChapters[chapter.name].topics[topic].incorrect += 1;
                    }
                    if (question.timeTakenInSeconds !== null) {
                      tempChapters[chapter.name].topics[topic].attempted += 1;
                    } else {
                      tempChapters[chapter.name].topics[topic].unattempted += 1;
                    }
                    tempChapters[chapter.name].topics[topic].marks +=
                      question.marks;
                    tempChapters[chapter.name].topics[
                      topic
                    ].timeTakenInSeconds += question.timeTakenInSeconds;
                  }
                });
              } else {
                tempChapters[chapter.name] = {
                  ...chapter,
                  totalQuestions: 1,
                  marks: question.marks,
                  attempted: question.timeTakenInSeconds ? 1 : 0,
                  unattempted: question.timeTakenInSeconds ? 0 : 1,
                  correct: question.marks > 0 ? 1 : 0,
                  incorrect: question.marks < 0 ? 1 : 0,
                };
                tempChapters[chapter.name].timeTakenInSeconds =
                  question.timeTakenInSeconds;
                // topics
                tempChapters[chapter.name].topics = {};
                chapter.topics.forEach((topic: any) => {
                  tempChapters[chapter.name].topics[topic] = {
                    name: topic,
                    totalQuestions: 1,
                    marks: question.marks,
                    attempted: question.timeTakenInSeconds ? 1 : 0,
                    unattempted: question.timeTakenInSeconds ? 0 : 1,
                    correct: question.marks > 0 ? 1 : 0,
                    incorrect: question.marks < 0 ? 1 : 0,
                  };
                  tempChapters[chapter.name].topics[topic].timeTakenInSeconds =
                    question.timeTakenInSeconds;
                });
              }
            });
          });
        });
      });
      setChapters(
        Object.values(tempChapters)?.map((item: any, i: number) => ({
          ...item,
          key: i.toString(),
        }))
      );
      console.log({ tempChapters });
    }
  }, [sections]);

  const subjectWiseColumns: any = [
    {
      title: "Chapter",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 200,
    },
    {
      title: "Total Questions",
      dataIndex: "totalQuestions",
      key: "totalQuestions",
      width: 150,
    },
    {
      title: "Attempted",
      dataIndex: "attempted",
      key: "attempted",
      width: 150,
    },
    {
      title: "Correct",
      dataIndex: "correct",
      key: "correct",
      width: 150,
    },
    {
      title: "Incorrect",
      dataIndex: "incorrect",
      key: "incorrect",
      width: 150,
    },
    {
      title: "Marks Obtained",
      dataIndex: "marks",
      key: "marks",
      width: 150,
    },
    {
      title: "Time Taken",
      dataIndex: "timeTakenInSeconds",
      key: "timeTakenInSeconds",
      width: 150,
      render: (time: number) => {
        return <>{time ? `${time.toFixed(2)} sec` : "-"}</>;
      },
    },
  ];

  const expandedRowRender = (record: any) => {
    const columns: any = subjectWiseColumns.map((col: any) =>
      col.title === "Chapter" ? { ...col, title: "Topics" } : col
    );

    const data = Object.values(record.topics).map((item: any, i: number) => ({
      ...item,
      key: i.toString(),
    }));

    return (
      <CustomTable columns={columns} dataSource={data} pagination={false} />
    );
  };

  return (
    <section className={styles.subjectWiseContainer}>
      <Card>
        <CustomTable
          columns={subjectWiseColumns}
          dataSource={chapters}
          expandable={{ expandedRowRender, defaultExpandedRowKeys: ["0"] }}
          scroll={{
            x: 600,
          }}
        />
      </Card>
    </section>
  );
};
