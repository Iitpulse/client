import styles from "./Subjects.module.scss";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../utils/auth/AuthContext";
import { API_QUESTIONS } from "../../utils/api/config";
import { PermissionsContext } from "../../utils/contexts/PermissionsContext";
import { TestContext } from "../../utils/contexts/TestContext";
import dayjs from "dayjs";
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
import { Sidebar } from "../../components";
import CustomDateRangePicker from "../../components/CustomDateRangePicker/CustomDateRangePicker";
import { styled, Box } from "@mui/system";
import { IconButton, TextField } from "@mui/material";
import MainLayout from "../../layouts/MainLayout";
import { Dayjs } from "dayjs";
import {
  convertFieldValue,
  convertStringToValidationFormat,
  mapIdWithValues,
  performZodValidation,
  validateField,
} from "../../utils/schemas";
import { SubjectSchema } from "./utils/SubjectModel";
// import {
// import { API_QUESTIONS } from './../../utils/api/config';
// Button,
//     Card,
//     CreatableSelect,
//     CustomTable,
//     MUIChipsAutocomplete,
//     Sidebar,
//     StyledMUISelect,
// } from "../../components";

const StyledMUITextField = styled(TextField)(() => {
  return {
    minWidth: "250px",
    input: {
      fontSize: "1rem",
      padding: "1.2rem 1.3rem",
    },
    label: {
      fontSize: "1rem",
      maxWidth: "none",
      padding: "0rem 0.5rem",
      backgroundColor: "transparent",
    },
    ".MuiInputLabel-root.Mui-focused": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
    ".MuiFormLabel-filled": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
  };
});

interface CreateNewSubjectProps {
  handleClose: () => void;
  toggleSideBar: boolean;
  setLoading: (loading: boolean) => void;
  setSubjects: any;
  title: string;
  editMode: boolean;
  selectedSubject: any;
}

const CreateNewSubject: React.FC<CreateNewSubjectProps> = ({
  handleClose,
  toggleSideBar,
  setLoading,
  setSubjects,
  title,
  editMode,
  selectedSubject,
}) => {
  const [form] = Form.useForm();
  const [values, setValues] = useState<any>({});
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { currentUser } = useContext(AuthContext);
  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    // console.log(e.target)
    const { id, value } = e.target;
    // console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  const conversionObject: any = {
    name: null,
  };

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, SubjectSchema),
      },
    ];
  }
  useEffect(() => {
    if (editMode && selectedSubject) {
      form.setFieldsValue({
        name: selectedSubject?.name,
        
      });
      setValues({
        name: selectedSubject?.name,
      });
    }
  }, [editMode, selectedSubject]);
  async function handleSubmit() {
    try {
      const additionalValues = {
        createdBy: {
          id: currentUser?.id,
          userType: currentUser?.userType,
        },
        createdAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
        modifiedAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
      };
      const result = performZodValidation(
        form,
        conversionObject,
        SubjectSchema,
        additionalValues
      );
      console.log("Final Data ->", { result });

      setLoading(true);
      console.log({ result });
      if (!editMode) {
        const res = await API_QUESTIONS().post(`/subject/create`, result);
        setSubjects((prev: any) => [...prev, res?.data?.data]);
        form.resetFields();
        message.success(res?.data?.message);
      } else {
        console.log(selectedSubject);
        result.id = selectedSubject?._id;
        const res = await API_QUESTIONS().patch(
          `/subject/subjects/name`,
          result
        );
        setSubjects((prev: any) => {
          const temp = [...prev];
          const index = temp.findIndex(
            (subject: any) => subject?.id === selectedSubject?.id
          );
          temp[index] = { ...temp[index], name: result?.name };
          return temp;
        });
        message.success(res?.data?.message);
      }
      handleClose();
    } catch (error: any) {
      console.log("ERROR_CREATE_SUBJECT", { error });
      message.error(error?.response?.data?.error);
    }
    setLoading(false);
    // console.log({ res });
  }

  return (
    <Sidebar
      title={title}
      open={toggleSideBar}
      width="350px"
      handleClose={() => {
        handleClose();
        form.resetFields();
      }}
    >
      <Form
        form={form}
        id="SubjectForm"
        layout="vertical"
        onFinish={handleSubmit}
      >
        <div className={styles.inputFields}>
          <Form.Item name="name" rules={getRules("name")}>
            <Input
              id="subjectName"
              size="large"
              value={values.subjectName}
              onChange={handleChangeValues}
              placeholder="Subject Name"
              // variant="outlined"
            />
          </Form.Item>

          <div className={styles.buttons}>
            <Button type="primary" htmlType="submit" disabled={submitDisabled}>
              Submit
            </Button>
          </div>
        </div>
      </Form>
    </Sidebar>
  );
};

export default CreateNewSubject;
