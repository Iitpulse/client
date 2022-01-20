import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home, Roles, Test, Users, Questions, Pattern, Batches } from "./pages";
import styles from "./App.module.scss";
import MainLayout from "./layouts/MainLayout";
import AuthContextProvider from "./utils/auth/AuthContext";

const App = () => {
  return (
    <div className={styles.container}>
      <AuthContextProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <MainLayout title="Home">
                  <Home />
                </MainLayout>
              }
            />
            <Route
              path="/batches"
              element={
                <MainLayout title="Batches">
                  <Batches />
                </MainLayout>
              }
            />

            <Route
              path="/pattern"
              element={
                <MainLayout title="Pattern">
                  <Pattern />
                </MainLayout>
              }
            />
            <Route
              path="/test"
              element={
                <MainLayout title="Test">
                  <Test />
                </MainLayout>
              }
            />
            <Route
              path="/questions"
              element={
                <MainLayout title="Questions">
                  <Questions />
                </MainLayout>
              }
            />
            <Route
              path="/roles"
              element={
                <MainLayout title="Roles">
                  <Roles />
                </MainLayout>
              }
            />
            <Route
              path="/users"
              element={
                <MainLayout title="Users">
                  <Users />
                </MainLayout>
              }
            />
          </Routes>
        </Router>
      </AuthContextProvider>
    </div>
  );
};

export default App;
