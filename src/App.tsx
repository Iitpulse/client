import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  Home,
  Roles,
  Test,
  Users,
  Questions,
  Pattern,
  Batches,
  Login,
  CreateTest,
  Results,
  EditRole,
  Error,
  DetailedAnalysis,
} from "./pages";
import styles from "./App.module.scss";
import AuthContextProvider from "./utils/auth/AuthContext";
import TestsContextProvider from "./utils/contexts/TestContext";
import PrivateRoute from "./utils/auth/PrivateRoute";
import PermissionsContextProvider from "./utils/contexts/PermissionsContext";
import UsersContextProvider from "./utils/contexts/UsersContext";
import CurrentContextProvider from "./utils/contexts/CurrentContext";
import { usePermission } from "./utils/contexts/PermissionsContext";
import { PERMISSIONS } from "./utils/constants";
import { useEffect } from "react";
import CreatePattern from "./pages/Pattern/CreatePattern";
import CreateQuestion from "./pages/Questions/CreateQuestion";
import "./App.css";

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
      <AuthContextProvider>
        <PermissionsContextProvider>
          <UsersContextProvider>
            <CurrentContextProvider>
              <TestsContextProvider>
                <Router>
                  <Routes>
                    <Route
                      path="/"
                      element={<PrivateRoute component={Home} name="Home" />}
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
                      path="/test"
                      element={<PrivateRoute component={Test} name="Test" />}
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
                      path="/test/result/:testId"
                      element={
                        <PrivateRoute component={Results} name="Results" />
                      }
                    />
                    <Route
                      path="/test/result/detailed-analysis/:testId"
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
                      path="/questions/new"
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
                  </Routes>
                </Router>
              </TestsContextProvider>
            </CurrentContextProvider>
          </UsersContextProvider>
        </PermissionsContextProvider>
      </AuthContextProvider>
    </div>
  );
};

export default App;
