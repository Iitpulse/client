import { useContext, useEffect, useState } from "react";
import styles from "./Login.module.scss";
import { decodeToken } from "react-jwt";
import { AuthContext } from "../../utils/auth/AuthContext";
import { useNavigate } from "react-router";
import logo from "../../assets/images/logo.svg";
import { API_USERS } from "../../utils/api/config";
import { AUTH_TOKEN } from "../../utils/constants";
import { Button, Form, Input, Radio, message } from "antd";

const Login = () => {
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const [isClicked, setIsClicked] = useState(false);
  const [emailMode, setEmailMode] = useState(1); // 1 for email, 0 for phone
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
    phone,
  }: {
    email: string;
    password: string;
    phone: string;
  }) {
    setIsClicked(true);
    let loading = message.loading({ content: "Logging in", key: "loader" });
    try {
      const response = await API_USERS().post(`/auth/login/`, {
        email,
        password,
        phone,
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
        if (decoded?.email) {
          message.success("Logged in with " + email);
        } else [message.success("Logged in with " + phone)];
        console.log("decoded", decoded);
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
    setIsClicked(false);
  }

  function handleClickSignup() {
    navigate("/student-register", { replace: true });
  }

  function handleClickForgotPassword() {
    navigate("/reset-password", { replace: true });
  }
  function onChange(e: any) {
    setEmailMode(e.target.value);
    console.log(`radio checked:${e.target.value}`);
  }
  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <img src={logo} className={styles.logo} alt="iitpulse" />
        <p>Please enter your email and password</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <Radio.Group
            style={{
              marginLeft: "auto",
            }}
            onChange={onChange}
            value={emailMode}
          >
            <Radio.Button value={1}>Email</Radio.Button>
            <Radio.Button value={0}>Phone</Radio.Button>
          </Radio.Group>
        </div>
        <div>
          <Form
            name="login"
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            className={styles.form}
          >
            {emailMode === 1 && (
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Please input your email!" },
                ]}
              >
                <Input />
              </Form.Item>
            )}
            {emailMode === 0 && (
              <Form.Item
                label="Phone Number"
                name="phone"
                rules={[
                  {
                    required: true,
                    message: "Please input your Phone Number!",
                  },
                ]}
              >
                <Input minLength={10} />
              </Form.Item>
            )}

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
                disabled={isClicked}
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
