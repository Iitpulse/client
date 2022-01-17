import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "./pages";
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
        </Routes>
      </Router>
    </div>
  );
};

export default App;
