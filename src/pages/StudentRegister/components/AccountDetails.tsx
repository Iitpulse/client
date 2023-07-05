import { StyledMUITextField } from "../../Users/components";
import z from "zod";
// import { Button } from "../../../components";
import { Button as MuiButton, TextField } from "@mui/material";
import { useState } from "react";
import styles from "../StudentRegister.module.scss";
import { Grid, Stack } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  message,
} from "antd";
import { API_USERS } from "../../../utils/api/config";

const AccountDetailsSchema = z.object({
  email: z.string().email(),
  emailotp: z.string().length(6),
  password: z.string().min(8).max(50),
  confirmPassword: z.string().min(8).max(50),
  joiningCode: z.string().length(6),
});
export type AccountDetailsValues = z.infer<typeof AccountDetailsSchema>;

const defaultState: AccountDetailsValues = {
  email: "",
  emailotp: "",
  password: "",
  confirmPassword: "",
  joiningCode: "",
};

function getErrorDefaultState(valuesObj: typeof defaultState) {
  const errorObj: any = {};
  Object.keys(valuesObj).forEach((key) => {
    errorObj[key] = false;
  });
  return errorObj;
}

interface Props {
  handleSubmit: (values: AccountDetailsValues) => void;
}

const AccountDetails: React.FC<Props> = ({ handleSubmit }) => {
  const [values, setValues] = useState<AccountDetailsValues>(defaultState);
  const [errors, setErrors] = useState({
    ...getErrorDefaultState(defaultState),
  });
  const [helperTexts, setHelperTexts] = useState(defaultState);

  function handleChangeValues(e: any) {
    console.log(values);
    const { id, value } = e.target;
    setValues((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  }

  function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(getErrorDefaultState(defaultState));
    setHelperTexts(defaultState);
    const isValid = AccountDetailsSchema.safeParse(values);
    if (!isValid.success) {
      console.log(isValid);
      isValid.error.issues.forEach((issue) => {
        setErrors((prevState: any) => ({
          ...prevState,
          [issue.path[0]]: true,
        }));
        setHelperTexts((prevState) => ({
          ...prevState,
          [issue.path[0]]: issue.message?.replace(
            "String",
            [issue.path[0]].toString().toUpperCase() || ""
          ),
        }));
      });
      return;
    }
    if (values.password !== values.confirmPassword) {
      setErrors((prevState: any) => ({
        ...prevState,
        password: true,
        confirmPassword: true,
      }));
      setHelperTexts((prevState) => ({
        ...prevState,
        password: "Passwords don't match",
        confirmPassword: "Passwords don't match",
      }));
      return;
    }
    handleSubmit(isValid.data);
  }

  const [showTextField, setShowTextField] = useState(false);
  const [buttonText, setButtonText] = useState("Verify Email");
  const [Verified, setVerified] = useState(false);

  const handleGenerate = async (
    e: any
  ) => {
    e.preventDefault();
    try {
      const response = await API_USERS().post(`/emailotp/generate`, {
        email: values.email,
      });
      message.loading({ content: response.data.message, key: "otp" });
    } catch (error) {
      console.log(error);
    }

    setTimeout(() => {
      message.destroy("otp");
    }, 1000);
    setShowTextField(true);
  };

  const handleVerify = async (
    e: any
  ) => {
    e.preventDefault();
    try {
      const response = await API_USERS().post(`/emailotp/verify`, {
        email: values.email,
        emailotp: values.emailotp,
      });
      message.loading({ content: response.data.message, key: "verify" });
      console.log(response.data.message);
      if (response.status == 200) {
        setShowTextField(false);
        setVerified(true);
        setButtonText("Verified");
      }
    } catch (error) {
      console.log(error);
    }

    setTimeout(() => {
      message.destroy("verify");
    }, 1000);
  };
  const theme = createTheme({
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiInputBase-root.Mui-disabled": {
              backgroundColor: "#f2f2f2",
              color: "#808080",
            },
          },
        },
      },
    },
  });

  return (
    <form onSubmit={handleSubmitForm} className={styles.regForm}>
      <ThemeProvider theme={theme}>
        <Grid container spacing={2} justifyContent={"space-between"}>
          <Grid item xs={12}>
            <Input
              size="large"
              disabled={Verified}
              // fullWidth
              required
              id="email"
              // type="email"
              // autoComplete="email"
              // error={errors.email}
              value={values.email}
              // helperText={helperTexts.email}
              onChange={handleChangeValues}
              placeholder="Email"
              // variant="outlined"
            />
          </Grid>
        </Grid>
        {/* <Grid item xs={10}> */}

        {!(Verified || showTextField) && (
          <Button onClick={handleGenerate} size="large" type="primary">
            {buttonText}
          </Button>
        )}
        {/* </Grid> */}
        {showTextField && (
          <Grid container spacing={2} justifyContent={"space-between"}>
            <Grid item xs={8}>
              <Input
                // fullWidth
                size="large"
                required
                id="emailotp"
                // type="number"
                // value={values.emailotp}
                // helperText=" We have sent an OTP to your Email"
                onChange={handleChangeValues}
                placeholder="Email OTP"
                // variant="outlined"
              />
            </Grid>

            <Grid item xs={4}>
              <Button onClick={handleVerify} size="large" type="primary">Verify</Button>
            </Grid>
          </Grid>
        )}

{Verified && 
          <>
            <Form>
              <Form.Item>
              <Input
                size="large"
                required
                id="password"
                // autoComplete="new-password"
                // value={values.password}
                // error={errors.password}
                // helperText={helperTexts.password}
                type="password"
                onChange={handleChangeValues}
                placeholder="Password"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  size="large"
                  required
                  id="confirmPassword"
                  autoComplete="new-password"
                  // value={values.confirmPassword}
                  // error={errors.confirmPassword}
                  // helperText={helperTexts.confirmPassword}
                  type="password"
                  onChange={handleChangeValues}
                  placeholder="Confirm Password"
                />
              </Form.Item>
              
              <Form.Item>
                <Input
                  size="large"
                  required
                  id="joiningCode"
                  // value={values.joiningCode}
                  // error={errors.joiningCode}
                  // helperText={helperTexts.joiningCode}
                  type="text"
                  onChange={handleChangeValues}
                  placeholder="Joining Code"
                  />
              </Form.Item>
            <Button type="primary">Next</Button>
            </Form>
          </>
        }
      </ThemeProvider>
    </form>
  );
};

export default AccountDetails;
