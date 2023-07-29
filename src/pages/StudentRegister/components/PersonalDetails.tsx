import { StyledMUITextField } from "../../Users/components";
import z, { number } from "zod";
// import { Button, StyledMUISelect } from "../../../components";
import { useEffect, useState } from "react";
import styles from "../StudentRegister.module.scss";
import { performZodValidation, validateField, } from "../../../utils/schemas";
import dayjs, { Dayjs } from "dayjs";
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


const validateMessages = {
  required: "${label} is required!",
  types: {
    email: '${label} is not a valid email!',
    // number: 'Not a valid number!',
  },
  number: {
    range: "${label} must be 10 digit",
  },
};

const PersonalDetailsSchema = z.object({
  name: z.string().min(3).max(50),
  dob: z.string(),
  city: z.string().max(50),
  state: z.string().max(50),
  gender: z.string(),
  address: z.string().min(5).max(150),
  parentName: z.string(),
  parentContact: z
    .number({
      invalid_type_error: "Please enter a valid contact number",
    })
    .min(1000000000, {
      message: "Contact number must be 10 digits long",
    })
    .max(9999999999, {
      message: "Contact number must be 10 digits long",
    }),
  contact:z
    .number({
      invalid_type_error: "Please enter a valid contact number",
    })
    .min(1000000000, {
      message: "Contact number must be 10 digits long",
    })
    .max(9999999999, {
      message: "Contact number must be 10 digits long",
    }),
});

const defaultState = {
  name: "",
  dob: "",
  city: "",
  state: "",
  parentName: "",
  parentContact: 0,
  contact: 0,
  address: "",
};

const conversionObject = {
  name: null,
  dob: {
    convert: (value: Dayjs) =>
      value ? dayjs(value).format("DD-MM-YYYY") : undefined,
    revert: (value: string) =>
      value ? dayjs(value, "DD-MM-YYYY").toDate() : null,
  },
  city: null,
  state: null,
  parentName: null,
  parentContact: {
    convert: (value: any) => parseInt(value),
    revert: (value: number) => value.toString(),
  },
  contact:{
    convert: (value: any) => parseInt(value),
    revert: (value: number) => value.toString(),
  },
  address: null,
}

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

  const onChangee: DatePickerProps["onChange"] = (date, dateString) => {
    setValues((prevState) => ({
      ...prevState,
      ["dob"]: dateString,
    }));
  };

  function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    // e.preventDefault();
    message.loading({ content: "Loading", key: "loader" });
    setErrors(getErrorDefaultState(defaultState));
    setHelperTexts(defaultState);
    let finalValues: PersonalDetailsValues = {
      ...values,
      gender,
      dob: new Date(values.dob).toISOString(),
    };
    const result = performZodValidation(
      form,
      conversionObject,
      PersonalDetailsSchema,
      []
    );
    const isValid = PersonalDetailsSchema.safeParse(result);
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
    message.destroy("loader");
  }

  const [showTextField, setShowTextField] = useState(false);
  const [buttonText, setButtonText] = useState("Verify Contact");
  const [Verified, setVerified] = useState(false);
  const [form] = Form.useForm();

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

  
  function getRules(fieldName: any) {
    try {
      return [
        {
          validateTrigger: "onSubmit",
          validator: (_: any, value: any) =>
            validateField(fieldName, value, conversionObject, PersonalDetailsSchema),
        },
      ];
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <Form
      form = {form}
      onFinish={handleSubmitForm}
      className={styles.regForm}
      validateMessages={validateMessages}
    >
      <div className={styles.regFormGrid}>
        <Form.Item name="name" rules={getRules("name")}>
          <Input
            size="large"
            id="name"
            placeholder="Name"
            // autoComplete="name"
            value={values.name}
            onChange={handleChangeValues}
            // variant="outlined"
          />
        </Form.Item>

        <Form.Item name="gender" rules={getRules("gender")}>
          <Select size="large" placeholder="Gender" onChange={setGender}>
            <Option value="male">Male</Option>
            <Option value="female">Female</Option>
            <Option value="other">Other</Option>
          </Select>
        </Form.Item>

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
        <Form.Item name="dob" rules={getRules("dob")}>
          <DatePicker style={{ width: '100%' }} id="dob" size="large" placeholder="Date of Birth" onChange={onChangee} disabledDate={(current) => {
                    return current && current.valueOf() > Date.now();
                  }}/>
        </Form.Item>
        <Form.Item name="city" rules={getRules("city")}>
          <Input
            size="large"
            id="city"
            placeholder="City"
            value={values.city}
            onChange={handleChangeValues}
            // variant="outlined"
          />
        </Form.Item>
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

        <Form.Item name="state" rules={getRules("state")}>
          <Select showSearch size="large" id="state" placeholder="State" onChange={(e)=>{setValues((prevState)=>({...prevState, ["state"]:e}))}}>
            {
              INDIAN_STATES.map((e)=>(
                <Select.Option key={e} value={e}>{e}</Select.Option>
              ))
            }
          </Select>  
        </Form.Item>

        <Form.Item name="parentName" rules={getRules("parentName")}>
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
        </Form.Item>

        <Form.Item name="parentContact" rules={getRules("parentContact")}>
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
        </Form.Item>

        <Form.Item name="contact" rules={getRules("contact")}>
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
        </Form.Item>

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
        <Form.Item name="address" rules={getRules("address")}>
          <Input
            size="large"
            id="address"
            // value={values.currentAddress}
            // error={errors.currentAddress}
            // helperText={helperTexts.currentAddress}
            type="text"
            onChange={handleChangeValues}
            placeholder="Address"
            // variant="outlined"
          />
        </Form.Item>
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
      <Button size="large" htmlType="submit" type="primary">
        Next
      </Button>
    </Form>
  );
};

export default PersonalDetails;
