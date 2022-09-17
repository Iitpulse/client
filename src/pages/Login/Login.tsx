import { useState, useContext } from "react";
import { Button, InputField } from "../../components";
import styles from "./Login.module.scss";
import { decodeToken } from "react-jwt";
import axios from "axios";
import { AuthContext } from "../../utils/auth/AuthContext";
import { useNavigate } from "react-router";
import logo from "../../assets/images/logo.svg";
import { LinearProgress, TextField } from "@mui/material";
import { API_USERS } from "../../utils/api";

const Login = () => {
  const { setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await API_USERS().post(`/auth/login/`, {
        email,
        password,
      });

      console.log({ decoded: decodeToken(response.data.token), response });

      if (response.status === 200) {
        let decoded = decodeToken(response.data.token) as any;
        let newRoles: any = {};
        decoded?.roles?.forEach((role: any) => {
          newRoles[role.id] = {
            id: role.id,
            permissions: [],
          };
        });
        setCurrentUser({
          id: decoded.id,
          email: decoded.email,
          userType: decoded.userType,
          instituteId: decoded.instituteId,
          roles: newRoles,
        });
        localStorage.setItem("token", response.data.token);
        setLoading(false);
        navigate("/");
      } else {
      }
    } catch (error: any) {
      // console.log("True error", error.response);
      setError(error.response.data.message);
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <img src={logo} alt="iitpulse" />
      <form onSubmit={handleSubmit}>
        <TextField
          id="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          disabled={loading}
        />
        <TextField
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          disabled={loading}
        />
        <Button title="Submit" type="submit" disabled={loading}>
          Submit
        </Button>
        {!loading && error && <span className={styles.error}>{error}</span>}
        {!error && loading && <LinearProgress className={styles.loading} />}
      </form>
    </div>
  );
};

export default Login;
