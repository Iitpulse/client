import { StyledMUITextField } from "../../Users/components";
import z from "zod";
// import { Button, StyledMUISelect } from "../../../components";
import { useContext, useEffect, useState } from "react";
import styles from "../StudentRegister.module.scss";
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
import { API_TESTS, API_USERS } from "../../../utils/api/config";
import { performZodValidation, validateField, } from "../../../utils/schemas";
import { AcademicSchema } from "./utils/AcademicModel";
import axios from "axios";
const { Option } = Select;

const AcademicDetailsSchema = z.object({
  school: z.string().min(3).max(50),
  standard: z.string(),
  medium: z.string(),
  stream: z.string(),
});

const defaultState = {
  school: "",
  standard: "",
  medium: "",
  stream: "",
};

function getErrorDefaultState(valuesObj: typeof defaultState) {
  const errorObj: any = {};
  Object.keys(valuesObj).forEach((key) => {
    errorObj[key] = false;
  });
  return errorObj;
}

export type AcademicDetailsValues = z.infer<typeof AcademicDetailsSchema>;

interface Props {
  handleSubmit: (values: AcademicDetailsValues) => void;
  setPrev: ()=>void;
}

const AcademicDetails: React.FC<Props> = ({ handleSubmit, setPrev }) => {
  const [form] = Form.useForm();
  const [values, setValues] = useState(defaultState);
  const [errors, setErrors] = useState(getErrorDefaultState(defaultState));
  const [helperTexts, setHelperTexts] = useState(defaultState);
  const [stream, setStream] = useState("");
  const [standard, setStandard] = useState("");
  const [medium, setMedium] = useState("");
  const [data, setData] = useState([]);
  const [selectedClass, setSelectedClass] = useState<any>();
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await axios.get(import.meta.env.VITE_USERS_API+`class/alll`);
        console.log({ res });
        setData(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_Classes", error);
        message.error("Error fetching Classes");
      }
    }
    fetchClasses();
  }, []);

  function handleChangeValues(e: any) {
    const { id, value } = e.target;
    setValues((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  }

  function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    // e.preventDefault();
    message.loading({ content: "Loading", key: "loader" });
    setErrors(getErrorDefaultState(defaultState));
    setHelperTexts(defaultState);
    const finalValues: AcademicDetailsValues = {
      ...values,
      standard,
      medium,
      stream,
    };
    console.log({ finalValues });
    const result = performZodValidation(
      form,
      conversionObject,
      AcademicSchema,
      []
    );
    const isValid = AcademicDetailsSchema.safeParse(result);
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
    console.log(isValid.data)
    handleSubmit(isValid.data);
    message.destroy("loader");
  }

  const conversionObject: any = {
    school: null,
    standard: null,
    medium: null,
    stream: null,
  };
  
  function getRules(fieldName: any) {
    try {
      return [
        {
          validateTrigger: "onSubmit",
          validator: (_: any, value: any) =>
            validateField(fieldName, value, conversionObject, AcademicSchema),
        },
      ];
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <>
      <Form
        className={styles.regForm2}
        form={form}
        id="managerUserForm"
        layout="vertical"
        onFinish={handleSubmitForm}
        // onFinishFailed={handleFinishFailed}
      >
        <Form.Item name="school" rules={getRules("school")}>
          <Input
            size="large"
            placeholder="School*"
            onChange={handleChangeValues}
          />
        </Form.Item>
        <Form.Item name="standard" rules={getRules("standard")}>
          <Select
            placeholder="Standard"
            size="large"
            onChange={(e) => {
              setStandard(e);
            }}
          >
            {/* <Option value="11">11</Option>
            <Option value="12">12</Option>
            <Option value="dropper">dropper</Option> */}
            {data?.map((e:any)=>
              (
                <Select.Option value={e.name} label={e.name}>{e.name}</Select.Option>
              )
            )}
          </Select>
        </Form.Item>
        <Form.Item name="medium" rules={getRules("medium")}>
          <Select
            placeholder="Medium"
            size="large"
            onChange={(e) => {
              setMedium(e);
            }}
          >
            <Option value="hindi">Hindi</Option>
            <Option value="english">English</Option>
          </Select>
        </Form.Item>
        <Form.Item name="stream" rules={getRules("stream")}>
          <Select
            placeholder="Stream"
            size="large"
            onChange={(e) => {
              setStream(e);
            }}
          >
            <Option value="pcm">PCM</Option>
            <Option value="pcb">PCB</Option>
            <Option value="pcmb">PCMB</Option>
            <Option value="arts">Arts</Option>
            <Option value="commerce">Commerce</Option>
          </Select>
        </Form.Item>
        <Button size="large" type="primary" htmlType="submit">
          Submit
        </Button>
      </Form>
      {/* <form onSubmit={handleSubmitForm} className={styles.regForm}>
      <StyledMUITextField
        id="school"
        required
        label="School"
        error={errors.school}
        helperText={helperTexts.school}
        value={values.school}
        onChange={handleChangeValues}
        variant="outlined"
      />
      <StyledMUISelect
        options={[
          { name: "11", value: "11" },
          { name: "12", value: "12" },
          { name: "dropper", value: "dropper" },
        ]}
        value={standard}
        label="Standard"
        onChange={setStandard}
      />
      <StyledMUISelect
        options={[
          { name: "Hindi", value: "hindi" },
          { name: "English", value: "english" },
        ]}
        value={medium}
        label="Medium"
        onChange={setMedium}
      />
      <StyledMUISelect
        options={[
          { name: "PCM", value: "pcm" },
          { name: "PCB", value: "pcb" },
          { name: "PCMB", value: "pcmb" },
          { name: "Arts", value: "arts" },
          { name: "Commerce", value: "commerce" },
        ]}
        value={stream}
        label="Stream"
        onChange={setStream}
      />

      <Button type="submit">Submit</Button>
    </form> */}
    </>
  );
};

export default AcademicDetails;
