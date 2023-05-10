import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import styles from './PasswordReset.module.scss';
import { useNavigate, useParams } from 'react-router';
import { TextField } from '@mui/material';
import { Button } from '../../components';

import { API_USERS } from "../../utils/api";
const PasswordReset = () => {
    const navigate = useNavigate();

    const [values, setValues] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [isValidURI, setIsValidURI] = useState(false);
    // const [user, setUser] = useState<any>(null);
    const [useremail, setUseremail] = useState(null);

    const { token } = useParams();

    const confirmToken = async () => {
        try {
            const res: any = await API_USERS().post(`passwordreset/verify`, {
                params: {
                    token,
                },
            });

            if (res.status === 200) {
                setIsValidURI(true);
                setUseremail(res.email)
                console.log(res.email)
            } else {
                return alert("Invalid Reset Link");
            }
        } catch (error: any) {
            alert(error.message);
        }
    }


    useEffect(() => {

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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (token && isValidURI) {
            if (values.confirmPassword !== values.newPassword) {
                setLoading(false);
                return alert("Passwords do not match");
            }
            try {
                const res = await API_USERS().post(`/reset-password/`, {
                    email: useremail,
                    newPassword: values.newPassword,
                });
                setLoading(false);
                alert(res.data.message);
                setTimeout(() => {
                    navigate("/login");
                }, 1000);
            } catch (error: any) {
                setLoading(false);
                return alert(error.message);
            }
        }

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
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit}>
                {/* <span className={styles.backToLogin} onClick={() => navigate("/login")}>
                    <p>Back to Login</p>
                </span> */}
                {/* <TextField
                    id="email"
                    label="Email"
                    required
                    value={values?.email}
                    onChange={handleChange}
                    type="email"
                    disabled={loading}
                /> */}

                <TextField
                    id="newPassword"
                    label="New Password"
                    required
                    value={values?.newPassword}
                    onChange={handleChange}
                    type="password"
                    disabled={loading}
                />
                <TextField
                    id="confirmPassword"
                    label="Confirm Password"
                    required
                    value={values?.confirmPassword}
                    onChange={handleChange}
                    type="password"
                    disabled={loading}
                />
                <div className={styles.buttons}>
                    <Button title="Submit" type="submit" disabled={loading}>
                        Reset Password
                    </Button>
                </div>
                {!loading && error && <span className={styles.error}>{error}</span>}
            </form>
        </div>
    );
};

export default PasswordReset;
