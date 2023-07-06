import { StyledMUITextField } from "../../Users/components";
import z from "zod";
// import { Button, StyledMUISelect } from "../../../components";
import { useEffect, useState } from "react";
import styles from "../StudentRegister.module.scss";
import { Grid } from "@mui/material";
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
  DatePickerProps,
  Space,
  message,
} from "antd";
import { INDIAN_STATES } from "../../../utils/constants";
const { Option } = Select;

import { ThemeProvider, createTheme } from "@mui/material/styles";

import { API_USERS } from "../../../utils/api/config";

const PersonalDetailsSchema = z.object({
  name: z.string().min(3).max(50),
  dob: z.string(),
  city: z.string().max(50),
  state: z.string().max(50),
  gender: z.string(),
  currentAddress: z.string().min(5).max(150),
  parentName: z.string(),
  parentContact: z.string().length(10),
  contact: z.string().length(10),
});

const defaultState = {
  name: "",
  dob: "",
  city: "",
  state: "",
  parentName: "",
  parentContact: "",
  contact: "",
  currentAddress: "",
};

function getErrorDefaultState(valuesObj: typeof defaultState) {
  const errorObj: any = {};
  Object.keys(valuesObj).forEach((key) => {
    errorObj[key] = false;
  });
  return errorObj;
}

export type PersonalDetailsValues = z.infer<typeof PersonalDetailsSchema>;

interface Props {
  handleSubmit: (values: PersonalDetailsValues) => void;
}


const PersonalDetails: React.FC<Props> = ({ handleSubmit }) => {
  const [gender, setGender] = useState("");
  const [values, setValues] = useState(defaultState);
  const [errors, setErrors] = useState(getErrorDefaultState(defaultState));
  const [helperTexts, setHelperTexts] = useState(defaultState);

  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    setValues((prevState) => ({
      ...prevState,
      [id]: value,
    }));
    console.log(values);
  }

  const onChangee: DatePickerProps['onChange'] = (date, dateString) => {
    setValues((prevState) => ({
      ...prevState,
      ["dob"]: dateString,
    }));
  };

  function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(getErrorDefaultState(defaultState));
    setHelperTexts(defaultState);
    let finalValues: PersonalDetailsValues = {
      ...values,
      gender,
      dob: new Date(values.dob).toISOString(),
    };
    const isValid = PersonalDetailsSchema.safeParse(finalValues);
    if (!isValid.success) {
      console.log(isValid);
      isValid.error.issues.forEach((issue) => {
        setErrors((prevState: any) => ({
          ...prevState,
          [issue.path[0]]: true,
        }));
        setHelperTexts((prevState) => ({
          ...prevState,
          [issue.path[0]]: issue.message,
        }));
      });
      return;
    }
    handleSubmit(isValid.data);
  }

  const [showTextField, setShowTextField] = useState(false);
  const [buttonText, setButtonText] = useState("Verify Contact");
  const [Verified, setVerified] = useState(false);

  const handleGenerate = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    try {
      const response = await API_USERS().post(`/otp/generate`, {
        number: values.contact,
      });
      message.loading({ content: response.data.message, key: "cotp" });
    } catch (error) {
      console.log(error);
    }

    setTimeout(() => {
      message.destroy("cotp");
    }, 1000);
    setShowTextField(true);
  };

  // const handleVerify = async (
  //   e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  // ) => {
  //   e.preventDefault();
  //   try {
  //     const response = await API_USERS().post(`/otp/verify`, {
  //       number: values.contact,
  //       otp: values.otp,
  //     });
  //     message.loading({ content: response.data.message, key: "verify" });
  //     console.log(response.data.message);
  //     if (response.status == 200) {
  //       setShowTextField(false);
  //       setVerified(true);
  //     }
  //   } catch (error) {
  //     console.log(error);
  //   }
  //   setButtonText("Verified");

  //   setTimeout(() => {
  //     message.destroy("verify");
  //   }, 1000);
  // };
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
      <div className={styles.regFormGrid}>
        <Input
          size="large"
          id="name"
          required
          placeholder="Name"
          // autoComplete="name"
          value={values.name}
          onChange={handleChangeValues}
          // variant="outlined"
        />
        <Select
          size="large"
          placeholder="Gender"
          onChange={setGender}
        >
          <Option value="male">Male</Option>
          <Option value="female">Female</Option>
          <Option value="other">Other</Option>
        </Select>

        {/* <StyledMUITextField
          required
          id="dob"
          inputProps={{
            min: "2000-01-01",
            max: new Date().toLocaleDateString("en-ca"),
          }}
          value={values.dob}
          error={errors.dob}
          helperText={helperTexts.dob}
          type="date"
          onChange={handleChangeValues}
          label="Date of Birth"
          variant="outlined"
        /> */}
        <DatePicker id="dob" size="large" placeholder="Date of Birth" onChange={onChangee} />
        <Input
          size="large"
          id="city"
          required
          placeholder="City"
          value={values.city}
          onChange={handleChangeValues}
          // variant="outlined"
        />
        {/* <StyledMUITextField
          required
          id="state"
          type="state"
          error={errors.state}
          value={values.state}
          helperText={helperTexts.state}
          onChange={handleChangeValues}
          label="State"
          variant="outlined"
        /> */}
        <Select size="large" id="state" placeholder="State" onChange={(e)=>{setValues((prevState)=>({...prevState, ["state"]:e}))}}>
          {
            INDIAN_STATES.map((e)=>(
              <Select.Option key={e} value={e}>{e}</Select.Option>
            ))
          }
        </Select>
        <Input
          size="large"
          id="parentName"
          // value={values.parentName}
          // error={errors.parentName}
          // helperText={helperTexts.parentName}
          type="text"
          onChange={handleChangeValues}
          placeholder="Parent Name"
          // variant="outlined"
        />
        <Input
          size="large"
          id="parentContact"
          // value={values.parentContact}
          // error={errors.parentContact}
          // helperText={helperTexts.parentContact}
          // type="number"
          onChange={handleChangeValues}
          placeholder="Parent Contact Number"
          // variant="outlined"
        />
        <Input
          size="large"
          id="contact"
          // value={values.contact}
          // error={errors.contact}
          // helperText={helperTexts.contact}
          onChange={handleChangeValues}
          // type="number"
          placeholder="Contact Number"
          // variant="outlined"
        />
          
        
        {/* <Button onClick={handleGenerate} disabled={Verified || showTextField}>
          {buttonText}
        </Button>

        {showTextField && (
          <>
            <StyledMUITextField
              fullWidth
              required
              id="otp"
              type="number"
              value={values.otp}
              // helperText='We have sent an OTP to your Contact'
              onChange={handleChangeValues}
              label="OTP"
              variant="outlined"
            />
            <Button onClick={handleVerify}>Verify</Button>
          </>
        )} */}
      </div>
      <div className={styles.regForm} style={{ marginTop: "0px" }}>
        <Input
          size="large"
          id="currentAddress"
          // value={values.currentAddress}
          // error={errors.currentAddress}
          // helperText={helperTexts.currentAddress}
          type="text"
          onChange={handleChangeValues}
          placeholder="Current Address"
          // variant="outlined"
        />
        {/* <StyledMUITextField
          required
          id="permanentAddress"
          value={values.permanentAddress}
          error={errors.permanentAddress}
          helperText={helperTexts.permanentAddress}
          type="text"
          onChange={handleChangeValues}
          label="Permanent Address"
          variant="outlined"
        /> */}
      </div>
      <Button htmlType="submit" type="primary">Next</Button>
    </form>
  );
};

export default PersonalDetails;
