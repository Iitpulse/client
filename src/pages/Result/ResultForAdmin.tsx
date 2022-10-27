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

interface Props {
  finalTest: any;
}

const ResultForAdmin: React.FC<Props> = ({ finalTest }) => {
  const { testId, testName, testExamName, studentId } = useParams();
  const hasResultViewPermission = usePermission(PERMISSIONS.TEST.VIEW_RESULT);

  const { currentUser } = useContext(AuthContext);

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
      {hasResultViewPermission && studentId ? (
        <StudentResultCore
          finalTest={finalTest}
          hasResultViewPermission={hasResultViewPermission}
        />
      ) : (
        <Card classes={[styles.globalResultTable]}>
          <GlobalResult
            students={finalTest.students || []}
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
