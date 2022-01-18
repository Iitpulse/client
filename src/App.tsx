import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home,Roles,Test,Users,Questions,Patterns,Batches } from "./pages";
import styles from "./App.module.scss";
import MainLayout from "./layouts/MainLayout";

const App = () => {
  return (
    <div className={styles.container}>
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
            path="/patterns"
            element={
              <MainLayout title="Patterns">
                <Patterns />
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
    </div>
  );
};

export default App;
