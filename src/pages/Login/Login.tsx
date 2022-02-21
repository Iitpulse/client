import { useState, useContext } from "react";
import { Button, InputField } from "../../components";
import styles from "./Login.module.scss";
import { decodeToken } from "react-jwt";
import axios from "axios";
import { AuthContext } from "../../utils/auth/AuthContext";
import { useNavigate } from "react-router";

const Login = () => {
  const { setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const response = await axios.post("http://localhost:5000/auth/login/", {
      email,
      password,
    });

    console.log({ decoded: decodeToken(response.data.token), response });

    if (response.status === 200) {
      let decoded = decodeToken(response.data.token) as any;
      setCurrentUser({
        id: decoded.id,
        email: decoded.email,
        userType: decoded.userType,
        instituteId: decoded.instituteId,
      });
      localStorage.setItem("token", response.data.token);
      navigate("/");
    }
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit}>
        <InputField
          id="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <InputField
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
        <Button title="Submit" type="submit">
          Submit
        </Button>
      </form>
    </div>
  );
};

export default Login;
