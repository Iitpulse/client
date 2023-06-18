import { useState, useContext, useEffect } from "react";
// import { Button, InputField } from "../../components";
import styles from "./Login.module.scss";
import { decodeToken } from "react-jwt";
import axios from "axios";
import { AuthContext } from "../../utils/auth/AuthContext";
import { useNavigate } from "react-router";
import logo from "../../assets/images/logo.svg";
import { LinearProgress, TextField } from "@mui/material";
import { API_USERS } from "../../utils/api/config";
import { AUTH_TOKEN } from "../../utils/constants";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import { Visibility } from "@mui/icons-material";
import { VisibilityOff } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
import { Link } from "react-router-dom";
import { Button, Checkbox, Form, Input, message } from "antd";

const Login = () => {
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  useEffect(() => {
    console.log(currentUser);
    if (currentUser != null) {
      navigate("/", { replace: true });
    }
  }, [currentUser]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    message.loading({ content: "Logging in", key: "loader" });
    try {
      const response = await API_USERS().post(`/auth/login/`, {
        email,
        password,
      });

      console.log({ decoded: decodeToken(response.data.token), response });

      if (response.status === 200) {
        let decoded = decodeToken(response.data.token) as any;
        console.log({ decoded });
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
        localStorage.setItem(AUTH_TOKEN, response.data.token);
        setLoading(false);
        navigate("/", { replace: true });
      } else {
      }
    } catch (error: any) {
      console.log("True error", error);
      if (error?.response?.data) {
        setError(error.response.data.message);
        message.error(error.response.data.message);
      } else {
        message.error("Network Error");
        setError("Network Error");
      }
      setLoading(false);
    }
    message.destroy("loader");
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <img src={logo} className={styles.logo} alt="iitpulse" />
        <p>Please enter your email and password</p>
        <Form
          name="basic"
          layout="vertical"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          style={{ maxWidth: 600 }}
          initialValues={{ remember: true }}
          // onFinish={onFinish}
          // onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Please input your email!" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="remember"
            valuePropName="checked"
            wrapperCol={{ offset: 8, span: 16 }}
          >
            <Checkbox>Remember me</Checkbox>
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
