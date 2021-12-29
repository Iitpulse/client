import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<>This is home route</>} />
      </Routes>
    </Router>
  );
};

export default App;
