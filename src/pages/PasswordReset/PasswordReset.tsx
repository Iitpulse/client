import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import styles from "./PasswordReset.module.scss";
import { useLocation, useNavigate, useParams } from "react-router";
import { TextField } from "@mui/material";
import {Input, Button, Form} from "antd";
import logo from "../../assets/images/logo.svg";


import { API_USERS } from "../../utils/api/config";
import { message } from "antd";

const PasswordReset = () => {
  const navigate = useNavigate();

  const [values, setValues] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isValidURI, setIsValidURI] = useState(false);
  // const [user, setUser] = useState<any>(null);
  const [useremail, setUseremail] = useState(null);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const token = queryParams.get("token");

  const confirmToken = async () => {
    try {
      const res: any = await API_USERS().post(`/reset-password/verify`, {
        token,
      });

      if (res.status === 200) {
        setIsValidURI(true);
        setUseremail(res.email);
        console.log(res.email);
      } else {
        return alert("Invalid Reset Link");
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  useEffect(() => {
    console.log({ token });
    if (token) {
      confirmToken();
    }
  }, [token]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value, name } = e.target;
    setValues((prev) => {
      return {
        ...prev,
        [name ? name : id]: value,
      };
    });
  };

  async function requestPasswordReset() {
    console.log("dekhlo");
    try {
      const response = await API_USERS().post(`/reset-password/request`, {
        email: values?.email,
      });

      if (response.status === 200) {
        message.success("Reset Link sent on your email");
        setLoading(false);
        // navigate("/");
      } else {
      }
    } catch (error: any) {
      // console.log("True error", error.response);
      message.error(error.response.data.message);
      setLoading(false);
    }
  }

  async function resetPassword() {
    setLoading(true);

    if (token && isValidURI) {
      if (values.confirmPassword !== values.newPassword) {
        setLoading(false);
        return message.error("Passwords do not match");
      }
      try {
        const res = await API_USERS().post(`/reset-password/reset`, {
          email: useremail,
          newPassword: values.newPassword,
          token,
        });
        setLoading(false);
        message.success("Password Reset Successfully");
        setTimeout(() => {
          navigate("/login");
        }, 1000);
      } catch (error: any) {
        setLoading(false);
        return message.error(error.response.data.message);
      }
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token && !isValidURI) {
      requestPasswordReset();
    } else {
      resetPassword();
    }
  };

  // if (!token && !useremail && !isValidURI) {
  //     try {
  //         const response = await API_USERS().post(`/request-password-reset/`, {
  //             email: values?.email,
  //         });

  //         if (response.status === 200) {
  //             alert("Reset Link sent on your email");
  //             setLoading(false);
  //             // navigate("/");
  //         } else {
  //         }
  //     } catch (error: any) {
  //         // console.log("True error", error.response);
  //         setError(error.response.data.message);
  //         setLoading(false);
  //     }
  // }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <img src={logo} className={styles.logo} alt="iitpulse" />
        <p>
          Please enter your Email
        </p>
      {!isValidURI && !token && (
        <Form layout="vertical" className={styles.form} >
          <Form.Item label="Email" name="email">
            <Input
              id="email"
              placeholder="Email"
              required
              value={values?.email}
              onChange={handleChange}
              type="email"
              disabled={loading}
            />
          </Form.Item>
          <Form.Item>
            <Button title="Submit" type="primary" onClick={handleSubmit} disabled={loading}>
              Send Reset Link
            </Button>
          </Form.Item>
          
          {!loading && error && <span className={styles.error}>{error}</span>}
        </Form>
      )}
      {isValidURI && token && (
          <Form layout="vertical" className={styles.form} >
          <Form.Item label="New Password" name="newPassword">
            <Input
              id="newPassword"
              placeholder="New Password"
              required
              value={values?.newPassword}
              onChange={handleChange}
              type="password"
              disabled={loading}
            />
          </Form.Item>
          <Form.Item label="Confirm Password" name="confirmPassword">
            <Input
              id="confirmPassword"
              placeholder="Confirm Password"
              required
              value={values?.confirmPassword}
              onChange={handleChange}
              type="password"
              disabled={loading}
            />
          </Form.Item>
            <Form.Item>
              <Button title="Submit" type="primary" onClick={handleSubmit} disabled={loading}>
                Reset Password
              </Button>
            </Form.Item>
            
            {!loading && error && <span className={styles.error}>{error}</span>}
          </Form>
      )}
      {isValidURI && !token && <h2>INVALID REQUEST!</h2>}
      </div>
    </div>
  );
};

export default PasswordReset;
