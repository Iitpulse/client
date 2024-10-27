import { useContext } from "react";
import { useParams } from "react-router";
import { Card, Navigate } from "../../components";
import { AuthContext } from "../../utils/auth/AuthContext";
import { PERMISSIONS } from "../../utils/constants";
import { usePermission } from "../../utils/contexts/PermissionsContext";
import { HeaderDetails } from "../DetailedAnalysis/DetailedAnalysis";
import GlobalResult from "./components/GlobalResult";
import styles from "./Result.module.scss";
import { StudentResultCore } from "./ResultForStudent";
import { Button } from "antd";

interface Props {
  finalTest: any;
}

const ResultForAdmin: React.FC<Props> = ({ finalTest }) => {
  const { testId, testName, testExamName, studentId } = useParams();
  const hasResultViewPermission = usePermission(PERMISSIONS.TEST.VIEW_RESULT);

  const { currentUser } = useContext(AuthContext);
  console.log("final test in result for admin",{ finalTest });
  return (
    <div className={styles.container}>
      <HeaderDetails
        name={testName || ""}
        type={finalTest?.type || ""}
        languages={[{ name: "English" }, { name: "Hindi" }]}
        duration={finalTest?.duration || 90}
        // totalAppeared={finalTest?.students?.length || 0}
        totalAppeared={finalTest?.totalAppeared || 0}
        totalQuestions={finalTest?.totalQuestions || 0}
        attempted={finalTest?.attempted || 0}
        totalMarks={finalTest?.students?.reduce((Total:any,ele:any) => {return Total+ele.marks},0) || 0}
        marksObtained={finalTest?.marksObtained || 0}
        // highestMarks={finalTest?.students?.reduce((Total:any,ele:any) => {return Math.max(Total,ele.marks)},0) || 0}
        highestMarks={finalTest?.highestMarks || 0}
        // lowestMarks={finalTest?.students?.reduce((Total:any,ele:any) => {return Math.min(Total,ele.marks)},1000) || 0}
        lowestMarks={finalTest?.lowestMarks || 0}
        // averageMarks={(finalTest?.students?.reduce((Total:any,ele:any) => {return Total+ele.marks},0)/finalTest?.students?.length) || 0}
        averageMarks={finalTest?.averageMarks || 0}
        status={finalTest?.status || ""}
        scheduledFor={finalTest?.scheduledFor || []}
        forStudent={Boolean(hasResultViewPermission && studentId)}
      />
      
      {hasResultViewPermission && studentId ? (
        <StudentResultCore
          finalTest={finalTest}
          hasResultViewPermission={hasResultViewPermission}
        />
      ) : (
        <Card classes={[styles.globalResultTable]}>
          <GlobalResult
            students={
              finalTest?.students?.sort(
                (a: any, b: any) => b?.marks - a?.marks
              ) || []
            }
            testId={String(testId)}
            testName={String(testName)}
            testExamName={String(testExamName)}
          />
        </Card>
      )}
    </div>
  );
};

export default ResultForAdmin;
