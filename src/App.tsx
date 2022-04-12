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
import { usePermission } from "./utils/contexts/PermissionsContext";
import { PERMISSIONS } from "./utils/constants";
import { useEffect } from "react";
import CreateQuestion from "./pages/Questions/CreateQuestion";

const App = () => {
  // const isBatchesPermitted = usePermission(
  //   PERMISSIONS?.BATCH?.READ ? PERMISSIONS.BATCH.READ : "undefined"
  // );

  function CheckRouteForPermission(
    permission: string,
    Component: any,
    title: string
  ) {
    const isPermitted = usePermission(permission);
    return isPermitted ? (
      <PrivateRoute title={title} component={Component} />
    ) : (
      <Error />
    );
  }
  // useEffect(() => {
  //   console.log(isBatchesPermitted);
  // });
  return (
    <div className={styles.container}>
      <AuthContextProvider>
        <PermissionsContextProvider>
          <TestsContextProvider>
            <Router>
              <Routes>
                <Route
                  path="/"
                  element={<PrivateRoute component={Home} title="Home" />}
                />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/batches"
                  element={<PrivateRoute component={Batches} title="Batches" />}
                  // element={CheckRouteForPermission(
                  //   PERMISSIONS.BATCH.READ,
                  //   Batches,
                  //   "Batches"
                  // )}
                />
                <Route
                  path="/pattern"
                  element={<PrivateRoute component={Pattern} title="Pattern" />}
                />
                <Route
                  path="/test"
                  element={<PrivateRoute component={Test} title="Test" />}
                />
                <Route
                  path="/test/new"
                  element={
                    <PrivateRoute component={CreateTest} title="Create Test" />
                  }
                />
                <Route
                  path="/test/result/:testId"
                  element={<PrivateRoute component={Results} title="Results" />}
                />
                <Route
                  path="/test/result/detailed-analysis/:testId"
                  element={
                    <PrivateRoute
                      component={DetailedAnalysis}
                      title="Detailed Analysis"
                    />
                  }
                />
                <Route
                  path="/questions"
                  element={
                    <PrivateRoute component={Questions} title="Questions" />
                  }
                />
                <Route
                  path="/roles"
                  element={<PrivateRoute component={Roles} title="Roles" />}
                />
                <Route
                  path="/roles/:roleName"
                  element={
                    <PrivateRoute component={EditRole} title="Edit Role" />
                  }
                />
                <Route
                  path="/users"
                  element={<PrivateRoute component={Users} title="Users" />}
                />
              </Routes>
            </Router>
          </TestsContextProvider>
        </PermissionsContextProvider>
      </AuthContextProvider>
    </div>
  );
};

export default App;
