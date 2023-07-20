import styles from "./Classes.module.scss";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../utils/auth/AuthContext";
import { API_QUESTIONS, API_TESTS, API_USERS } from "../../utils/api/config";
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
import { ClassSchema } from "./utils/ClassModel";
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

interface CreateNewClassProps {
  handleClose: () => void;
  toggleSideBar: boolean;
  setLoading: (loading: boolean) => void;
  setClasses: any;
  title: string;
  editMode: boolean;
  selectedClass: any;
}

const CreateNewClass: React.FC<CreateNewClassProps> = ({
  handleClose,
  toggleSideBar,
  setLoading,
  setClasses,
  title,
  editMode,
  selectedClass,
}) => {
  const [form] = Form.useForm();
  const [values, setValues] = useState<any>({
    name: "",
    fullName: "",
  });
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { subjects: subjectOptions } = useContext(TestContext);

  const conversionObject: any = {
    name: null,
    fullName: null,
    createdAt: null,
    createdBy: null,
    modifiedAt: null,
  };

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, ClassSchema),
      },
    ];
  }
  useEffect(() => {
    if (editMode && selectedClass) {
      console.log({ selectedClass });
      setValues({
        name: selectedClass?.name,
        fullName: selectedClass?.fullName,
      });
      form.setFieldsValue({
        name: selectedClass?.name,
        fullName: selectedClass?.fullName,
      });
    }
  }, [editMode, selectedClass]);
  console.log({ values });
  async function handleSubmit() {
    try {
      const additionalValues = {
        createdBy: {
          id: currentUser?.id,
          userType: currentUser?.userType,
        },
        createdAt: dayjs().toISOString(),
        modifiedAt: dayjs().toISOString(),
      };
      const result = performZodValidation(
        form,
        conversionObject,
        ClassSchema,
        additionalValues
      );
      console.log("Final Data ->", { result });
      // console.log({ finalData });
      setLoading(true);
      console.log({ result, subjectOptions });

      if (!editMode) {
        const res = await API_USERS().post(`/class/create`, {
          ...result,
          ...additionalValues,
        });

        setClasses((prev: any) => [
          ...prev,
          {
            ...result,
            ...additionalValues,
            _id: res?.data?._id,
          },
        ]);
        form.resetFields();
        message.success("Class Created Successfully");
      } else {
        console.log(selectedClass);
        result.id = selectedClass?._id;
        const res = await API_USERS().patch(`/class/update`, result);
        setClasses((prev: any) => {
          const temp = [...prev];
          const index = temp.findIndex(
            (classes: any) => classes?._id === selectedClass?._id
          );
          temp[index] = result;
          return temp;
        });
        message.success("Class Updated Successfully");
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
      <Form
        form={form}
        id="ClassForm"
        layout="vertical"
        onFinish={handleSubmit}
      >
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
              placeholder="Class Name"
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
              placeholder="Class Full Name"
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

export default CreateNewClass;
