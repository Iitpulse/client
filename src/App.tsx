import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  Home,
  Roles,
  Test,
  TestOG,
  TestUC,
  Users,
  Questions,
  QuestionsNew,
  Pattern,
  Batches,
  Login,
  CreateTest,
  Result,
  EditRole,
  Error,
  DetailedAnalysis,
  StudentRegister,
  PasswordReset,
  Profile,
} from "./pages";
import styles from "./App.module.scss";
import AuthContextProvider from "./utils/auth/AuthContext";
import TestsContextProvider from "./utils/contexts/TestContext";
import PrivateRoute from "./utils/auth/PrivateRoute";
import PermissionsContextProvider from "./utils/contexts/PermissionsContext";
import UsersContextProvider from "./utils/contexts/UsersContext";
import CurrentContextProvider from "./utils/contexts/CurrentContext";
import CreatePattern from "./pages/Pattern/CreatePattern";
import CreateQuestion from "./pages/Questions/CreateQuestion";
import "./App.css";
import BulkWord from "./pages/Questions/BulkWord/BulkWord";
import AddNewRole from "./pages/Roles/AddNewRole";
import Subjects from "./pages/Subjects/Subjects";
import Chapters from "./pages/Chapters/Chapters";
import SubjectManagement from "./pages/SubjectsManagement/SubjectManagement";
import Institutes from "./pages/Institutes/Institutes";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";

const App = () => {
  // const isBatchesPermitted = usePermission(
  //   PERMISSIONS?.BATCH?.READ ? PERMISSIONS.BATCH.READ : "undefined"
  // );

  // function CheckRouteForPermission(
  //   permission: string,
  //   Component: any,
  //   title: string
  // ) {
  //   const isPermitted = usePermission(permission);
  //   return isPermitted ? (
  //     <PrivateRoute name={name} component={Component} />
  //   ) : (
  //     <Error />
  //   );
  // }
  // useEffect(() => {
  //   console.log(isBatchesPermitted);
  // });
  return (
    <div className={styles.container}>
      <Router basename="/">
        <AuthContextProvider>
          <PermissionsContextProvider>
            <UsersContextProvider>
              <CurrentContextProvider>
                <TestsContextProvider>
                  <Routes>
                    <Route
                      path="/"
                      element={<PrivateRoute component={Home} name="Home" />}
                    />
                    <Route
                      path="/subjects"
                      element={
                        <PrivateRoute
                          component={SubjectManagement}
                          name="Misc"
                        />
                      }
                    />
                    <Route
                      path="/institutes"
                      element={
                        <PrivateRoute
                          component={Institutes}
                          name="Institutes"
                        />
                      }
                    />

                    <Route
                      path="/questions/new-bulk-word"
                      element={
                        <PrivateRoute
                          component={BulkWord}
                          name="Bulk Upload Word"
                        />
                      }
                    />
                    <Route path="/login" element={<Login />} />
                    <Route
                      path="/batches"
                      element={
                        <PrivateRoute component={Batches} name="Batches" />
                      }
                      // element={CheckRouteForPermission(
                      //   PERMISSIONS.BATCH.READ,
                      //   Batches,
                      //   "Batches"
                      // )}
                    />
                    {/* <Route
                      path="/batches/new"
                      element={
                        <PrivateRoute
                          component={CreateNewBatch}
                          name="Create Batches"
                        />
                      }
                    /> */}
                    <Route
                      path="/profile/:userId"
                      element={
                        <PrivateRoute component={Profile} name="Profile" />
                      }
                    />
                    <Route
                      path="/pattern"
                      element={
                        <PrivateRoute component={Pattern} name="Pattern" />
                      }
                    />
                    <Route
                      path="/pattern/new"
                      element={
                        <PrivateRoute
                          component={CreatePattern}
                          name="Create Pattern"
                        />
                      }
                    />
                    <Route
                      path="/pattern/edit/:patternId"
                      element={
                        <PrivateRoute
                          component={CreatePattern}
                          name="Create Pattern"
                        />
                      }
                    />
                    <Route
                      path="/test"
                      element={<PrivateRoute component={Test} name="Test" />}
                    />
                    <Route
                      path="/ongoing-test"
                      element={
                        <PrivateRoute component={TestOG} name="Ongoing Test" />
                      }
                    />
                    <Route
                      path="/upcoming-test"
                      element={
                        <PrivateRoute component={TestUC} name="Upcoming Test" />
                      }
                    />
                    <Route
                      path="/test/new"
                      element={
                        <PrivateRoute
                          component={CreateTest}
                          name="Create Test"
                        />
                      }
                    />
                    <Route
                      path="/test/edit/:testId"
                      element={
                        <PrivateRoute component={CreateTest} name="Edit Test" />
                      }
                    />
                    <Route
                      path="/test/result/:testName/:testExamName/:testId"
                      element={
                        <PrivateRoute component={Result} name="Results" />
                      }
                    />
                    <Route
                      path="/test/result/:testName/:testExamName/:testId/student/:studentId"
                      element={
                        <PrivateRoute component={Result} name="Results" />
                      }
                    />
                    <Route
                      path="/test/result/detailed-analysis/:testName/:testExamName/:testId"
                      element={
                        <PrivateRoute
                          component={DetailedAnalysis}
                          name="Detailed Analysis"
                        />
                      }
                    />
                    <Route
                      path="/questions"
                      element={
                        <PrivateRoute component={Questions} name="Questions" />
                      }
                    />
                    <Route
                      path="/questionsnew"
                      element={
                        <PrivateRoute
                          component={QuestionsNew}
                          name="QuestionsNew"
                        />
                      }
                    />
                    <Route
                      path="/questions/new"
                      element={
                        <PrivateRoute
                          component={CreateQuestion}
                          name="Create Question"
                        />
                      }
                    />
                    <Route
                      path="/questions/edit/:id"
                      element={
                        <PrivateRoute
                          component={CreateQuestion}
                          name="Create Question"
                        />
                      }
                    />
                    <Route
                      path="/roles"
                      element={<PrivateRoute component={Roles} name="Roles" />}
                    />
                    <Route
                      path="/roles/:roleName"
                      element={
                        <PrivateRoute component={EditRole} name="Edit Role" />
                      }
                    />
                    <Route
                      path="/users"
                      element={<PrivateRoute component={Users} name="Users" />}
                    />
                    <Route
                      path="/student-register"
                      element={<StudentRegister />}
                    />
                    <Route path="/reset-password" element={<PasswordReset />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </TestsContextProvider>
              </CurrentContextProvider>
            </UsersContextProvider>
          </PermissionsContextProvider>
        </AuthContextProvider>
      </Router>
    </div>
  );
};

export default App;
