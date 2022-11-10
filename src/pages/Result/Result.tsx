import styles from "./Result.module.scss";
import { useParams } from "react-router";
import { useContext, useEffect, useState } from "react";
import { CircularProgress as MUICircularProgress, styled } from "@mui/material";
import { API_TESTS } from "../../utils/api";
import { AuthContext } from "../../utils/auth/AuthContext";
import { usePermission } from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../utils/constants";
import ResultForStudent from "./ResultForStudent";
import ResultForAdmin from "./ResultForAdmin";
import { message } from "antd";
import MainLayout from "../../layouts/MainLayout";

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
              studentId,
            },
          });
          console.log("student result", res.data);
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
    <MainLayout name="Result">
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

        {/* <Sidebar title="Recent Activity">
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
      </Sidebar> */}
      </div>
    </MainLayout>
  );
};

export default Result;
