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
} from "./pages";
import styles from "./App.module.scss";
import AuthContextProvider from "./utils/auth/AuthContext";
import TestsContextProvider from "./utils/contexts/TestContext";
import PrivateRoute from "./utils/auth/PrivateRoute";
import PermissionContextProvider from "./utils/contexts/PermissionContext";

const App = () => {
  return (
    <div className={styles.container}>
      <AuthContextProvider>
        <PermissionContextProvider>
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
                  path="/users"
                  element={<PrivateRoute component={Users} title="Users" />}
                />
              </Routes>
            </Router>
          </TestsContextProvider>
        </PermissionContextProvider>
      </AuthContextProvider>
    </div>
  );
};

export default App;
