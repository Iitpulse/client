// import { StyledMUITextField } from "../../Users/components";
import z from "zod";
// import { Button } from "../../../components";
// import { Button as MuiButton, TextField } from "@mui/material";
import { useState } from "react";
import styles from "../StudentRegister.module.scss";
import { Grid, Stack } from "@mui/material";
// import { ThemeProvider, createTheme } from "@mui/material/styles";
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
import { performZodValidation, validateField } from "../../../utils/schemas";

const AccountDetailsSchema = z.object({
  contact: z.string().length(10),
  phoneOtp: z.string().length(6),
  password: z.string().min(6).max(50),
  confirmPassword: z.string().min(6).max(50),
  promoCode: z.string().length(6),
});
export type AccountDetailsValues = z.infer<typeof AccountDetailsSchema>;

const defaultState: AccountDetailsValues = {
  contact: "",
  phoneOtp: "",
  password: "",
  confirmPassword: "",
  promoCode: "",
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
  const [form] = Form.useForm();
  const [values, setValues] = useState<AccountDetailsValues>(defaultState);
  const [errors, setErrors] = useState({
    ...getErrorDefaultState(defaultState),
  });
  const [helperTexts, setHelperTexts] = useState(defaultState);

  function handleChangeValues(e: any) {
    // console.log(values);
    const { id, value } = e.target;
    setValues((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  }

  function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    // e.preventDefault();
    message.loading({ content: "Logging in", key: "loader" });
    if (
      values.password.length == 0 ||
      values.confirmPassword.length == 0 ||
      values.promoCode.length == 0
    )
      return;
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
    message.destroy("loader");
  }

  const [showTextField, setShowTextField] = useState(false);
  const [buttonText, setButtonText] = useState("Verify Phone");
  const [Verified, setVerified] = useState(false);

  const handleGenerate = async (e: any) => {
    e.preventDefault();
    if (values.contact.length != 10) {
      message.error({ content: "Contact number must be 10 digit long" });
      return;
    }
    message.loading({ content: "Generating OTP", key: "GENERATE_OTP" });
    const phoneLowerCase = values.contact.toLowerCase();
    setValues((prevState) => ({ ...prevState, contact: phoneLowerCase }));
    try {
      const response = await API_USERS().post(`/otp/generate`, {
        number: phoneLowerCase,
      });
      message.destroy("GENERATE_OTP");
      message.success({ content: response.data.message, key: "otp" });
    } catch (error: any) {
      message.destroy("GENERATE_OTP");
      // message.error({content: error})
      message.error({ content: error?.response?.data?.message });
      console.log({ error });
      return;
    }

    setTimeout(() => {
      message.destroy("otp");
    }, 1000);
    setShowTextField(true);
  };

  const handleVerify = async (e: any) => {
    e.preventDefault();
    const phoneLowerCase = values.contact;
    setValues((prevState) => ({ ...prevState, contact: phoneLowerCase }));
    const loading = message.loading({
      content: "Verifying OTP",
      key: "verify",
    });
    if (values.phoneOtp.length != 6) {
      message.error({ content: "OTP length must be 6 digit" });
      return;
    }
    try {
      const response = await API_USERS().post(`/otp/verify`, {
        number: phoneLowerCase,
        otp: values.phoneOtp,
      });
      loading();
      message.success({ content: response.data.message, key: "verify" });
      // console.log(response.data.message);
      if (response.status == 200) {
        setShowTextField(false);
        setVerified(true);
        setButtonText("Verified");
      }
    } catch (error: any) {
      loading();
      message.error({ content: error?.response?.data?.message });
      console.log({ error });
    }

    setTimeout(() => {
      message.destroy("verify");
    }, 1000);
  };

  const conversionObject: any = {
    contact: null,
    phoneOtp: null,
    password: null,
    confirmPassword: null,
    promoCode: null,
  };
  function getRules(fieldName: any) {
    try {
      return [
        {
          validateTrigger: "onSubmit",
          validator: (_: any, value: any) =>
            validateField(
              fieldName,
              value,
              conversionObject,
              AccountDetailsSchema
            ),
        },
      ];
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <Form form={form} onFinish={handleSubmitForm} className={styles.regForm}>
      <Row>
        <Col span={24}>
          <Form.Item name="contact" rules={getRules("contact")}>
            <Input
              size="large"
              disabled={Verified}
              required
              id="contact"
              value={values.contact}
              onChange={handleChangeValues}
              placeholder="Contact number"
            />
          </Form.Item>
        </Col>
      </Row>
      {/* <Grid item xs={10}> */}

      {!(Verified || showTextField) && (
        <Button
          onClick={handleGenerate}
          htmlType="submit"
          size="large"
          type="primary"
        >
          {buttonText}
        </Button>
      )}
      {/* </Grid> */}
      {showTextField && (
        <Row gutter={10}>
          <Col span={12}>
            <Form.Item name="phoneOtp" rules={getRules("phoneOtp")}>
              <Input
                // fullWidth
                size="large"
                required
                id="phoneOtp"
                // type="number"
                // value={values.phoneOtp}
                // helperText=" We have sent an OTP to your Phone"
                onChange={handleChangeValues}
                placeholder="Phone OTP"
                // variant="outlined"
              />
            </Form.Item>
          </Col>

          <Col span={4}>
            <Button onClick={handleVerify} size="large" type="primary">
              Verify
            </Button>
          </Col>
        </Row>
      )}

      {Verified && (
        <>
          <Form.Item name="password" rules={getRules("password")}>
            <Input.Password
              size="large"
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
          <Form.Item name="confirmPassword" rules={getRules("confirmPassword")}>
            <Input
              size="large"
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
          <Form.Item name="promoCode" rules={getRules("promoCode")}>
            <Input
              size="large"
              id="promoCode"
              // value={values.promoCode}
              // error={errors.promoCode}
              // helperText={helperTexts.promoCode}
              type="text"
              onChange={handleChangeValues}
              placeholder="Promo Code"
            />
          </Form.Item>
          <Button size="large" type="primary" htmlType="submit">
            Next
          </Button>
        </>
      )}
    </Form>
  );
};

export default AccountDetails;
