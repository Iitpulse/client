import styles from "./Exams.module.scss";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../utils/auth/AuthContext";
import { API_QUESTIONS, API_TESTS } from "../../utils/api/config";
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
import { ExamSchema } from "./utils/ExamModel";
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

interface CreateNewExamProps {
  handleClose: () => void;
  toggleSideBar: boolean;
  setLoading: (loading: boolean) => void;
  setExams: any;
  title: string;
  editMode: boolean;
  selectedExam: any;
}

const CreateNewExam: React.FC<CreateNewExamProps> = ({
  handleClose,
  toggleSideBar,
  setLoading,
  setExams,
  title,
  editMode,
  selectedExam,
}) => {
  const [form] = Form.useForm();
  const [values, setValues] = useState<any>({
    name: "",
    subject: "",
    chapter: "",
    oldExam: "",
  });
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { subjects: subjectOptions } = useContext(TestContext);

  const conversionObject: any = {
    name: null,
    subject: null,
    chapter: null,

  };

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, ExamSchema),
      },
    ];
  }
  useEffect(() => {
    if (editMode && selectedExam) {
      console.log({ selectedExam });
      setValues({
        name: selectedExam?.name,
        fullName: selectedExam?.fullName,
      });
      form.setFieldsValue({
        name: selectedExam?.name,
        fullName: selectedExam?.fullName,
      });
    }
  }, [editMode, selectedExam]);
  console.log({ values });
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
        ExamSchema,
        additionalValues
      );
      console.log("Final Data ->", { result });
      // console.log({ finalData });
      setLoading(true);
      console.log({ result, subjectOptions });

      if (!editMode) {
        const res = await API_TESTS().post(`/exam/create`, result);

        setExams((prev: any) => [
          ...prev,
          {
            ...result,
            _id: res?.data?._id,
          },
        ]);
        form.resetFields();
        message.success("Exam Created Successfully");
      } else {
        console.log(selectedExam);
        result.id = selectedExam?._id;
        const res = await API_TESTS().patch(`/exam/update`, result);
        setExams((prev: any) => {
          const temp = [...prev];
          const index = temp.findIndex(
            (exam: any) => exam?._id === selectedExam?._id
          );
          temp[index] = result;
          return temp;
        });
        message.success("Exam Updated Successfully");
      }
      handleClose();
    } catch (error: any) {
      console.log("ERROR_CREATE_exam", { error });
      message.error(error?.response?.data?.error);
    }
    setLoading(false);
    // console.log({ res });
  }

  return (
    <Sidebar
      title={title}
      open={toggleSideBar}
      width="30%"
      handleClose={() => {
        handleClose();
        form.resetFields();
        setValues({});
      }}
    >
      <Form form={form} id="ExamForm" layout="vertical" onFinish={handleSubmit}>
        <div className={styles.inputFields}>
          <Form.Item name="name" rules={getRules("name")}>
            <Input
              id="name"
              size="large"
              value={values.name}
              onChange={(e) => {
                setValues((prev: any) => ({
                  ...prev,
                  ["name"]: e.target.value,
                }));
              }}
              placeholder="Exam Name"
              // variant="outlined"
            />
          </Form.Item>
          <Form.Item name="fullName" rules={getRules("fullName")}>
            <Input
              id="fullName"
              size="large"
              value={values.fullName}
              onChange={(e) => {
                setValues((prev: any) => ({
                  ...prev,
                  ["fullName"]: e.target.value,
                }));
              }}
              placeholder="Exam Full Name"
              // variant="outlined"
            />
          </Form.Item>

          <Form.Item name="subjects" rules={getRules("subjects")}>
            <Select
            size="large"
              mode="multiple"
              placeholder="Please choose subject/s"
              onChange={(e) => {
                console.log(e);
                setValues((prev: any) => ({
                  ...prev,
                  ["subject"]: e,
                }));
              }}
            >
              {subjectOptions?.map((option: any) => (
                <Select.Option key={option.id} value={option.name}>
                  {option.name}
                </Select.Option>
              ))}
            </Select>
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

export default CreateNewExam;
