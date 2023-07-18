import { useContext, useEffect } from "react";
import styles from "./Login.module.scss";
import { decodeToken } from "react-jwt";
import { AuthContext } from "../../utils/auth/AuthContext";
import { useNavigate } from "react-router";
import logo from "../../assets/images/logo.svg";
import { API_USERS } from "../../utils/api/config";
import { AUTH_TOKEN } from "../../utils/constants";
import { Button, Form, Input, message } from "antd";

const Login = () => {
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    console.log(currentUser);
    if (currentUser != null) {
      navigate("/", { replace: true });
    }
  }, [currentUser]);

  async function handleSubmit({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    let loading = message.loading({ content: "Logging in", key: "loader" });
    try {
      const response = await API_USERS().post(`/auth/login/`, {
        email:resEmail,
        password,
      });

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
        localStorage.setItem(AUTH_TOKEN, response.data.token);
        loading();
        message.success("Logged in with " + decoded.email);
        navigate("/", { replace: true });
      } else {
      }
    } catch (error: any) {
      console.log("True error", error);
      if (error?.response?.data) {
        loading();
        message.error(error.response.data.message);
      } else {
        loading();
        message.error("Network Error");
      }
    }
  }

  function handleClickSignup() {
    navigate("/student-register", { replace: true });
  }

  function handleClickForgotPassword() {
    navigate("/reset-password", { replace: true });
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <img src={logo} className={styles.logo} alt="iitpulse" />
        <p>Please enter your email and password</p>
        <div>
          <Form
            name="login"
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            className={styles.form}
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
              rules={[
                { required: true, message: "Please input your password!" },
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className={styles.submitBtn}
              >
                Submit
              </Button>
            </Form.Item>
          </Form>
          <div className={styles.extras}>
            <Button type="default" onClick={handleClickSignup}>
              Sign Up
            </Button>
            <Button onClick={handleClickForgotPassword} type="link">
              Forgot Password?
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
