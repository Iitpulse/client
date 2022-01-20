import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home, Roles, Test, Users, Questions, Pattern, Batches } from "./pages";
import styles from "./App.module.scss";
import MainLayout from "./layouts/MainLayout";
import AuthContextProvider from "./utils/auth/AuthContext";
import PrivateRoute from "./utils/auth/PrivateRoute";

const App = () => {
  return (
    <div className={styles.container}>
      <AuthContextProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={<PrivateRoute component={Home} title="Home" />}
            />
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
              path="/questions"
              element={<PrivateRoute component={Questions} title="Questions" />}
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
      </AuthContextProvider>
    </div>
  );
};

export default App;
