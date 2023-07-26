import styles from "./Chapters.module.scss";
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
import { ChapterSchema } from "./utils/ChapterModel";
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

interface CreateNewChapterProps {
  handleClose: () => void;
  toggleSideBar: boolean;
  setLoading: (loading: boolean) => void;
  setChapters: any;
  title: string;
  editMode: boolean;
  selectedChapter: any;
}

const CreateNewChapter: React.FC<CreateNewChapterProps> = ({
  handleClose,
  toggleSideBar,
  setLoading,
  setChapters,
  title,
  editMode,
  selectedChapter,
}) => {
  const [form] = Form.useForm();
  const [values, setValues] = useState<any>({
    name: "",
    subject: "",
    oldChapter: "",
  });
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { subjects: subjectOptions } = useContext(TestContext);
  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    // console.log(e.target)
    const { id, value } = e.target;
    // console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  const conversionObject: any = {
    name: null,
    subject: null,
  };

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, ChapterSchema),
      },
    ];
  }
  useEffect(() => {
    if (editMode && selectedChapter) {
      console.log({ selectedChapter });
      setValues({
        name: selectedChapter?.name,
        subject: selectedChapter?.subject,
        oldChapter: selectedChapter?.name,
      });
      form.setFieldsValue({
        name: selectedChapter?.name,
        subject: selectedChapter?.subject,
      });
    }
  }, [editMode, selectedChapter]);
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
        ChapterSchema,
        additionalValues
      );
      console.log("Final Data ->", { result });
      // console.log({ finalData });
      result.subjectId = subjectOptions.find(
        (subject: any) => subject.name === result.subject
      )._id;
      setLoading(true);
      console.log({ result });
      if (!editMode) {
        const res = await API_QUESTIONS().post(
          `/subject/create-chapter`,
          result
        );
        setChapters((prev: any) => [
          ...prev,
          {
            name: result.name,
            subject: values.subject,
          },
        ]);
        form.resetFields();
        message.success(res?.data?.message);
      } else {
        console.log(selectedChapter);
        result.id = selectedChapter?.id;
        result.oldChapter = values.oldChapter;
        console.log({result});
        const res = await API_QUESTIONS().patch(`/subject/update-chapter`, result);
        setChapters((prev: any) => {
          const temp = [...prev];
          const index = temp.findIndex(
            (chapter: any) => chapter?.id === selectedChapter?.id
          );
          temp[index] = result;
          return temp;
        });
        message.success(res?.data?.message);
      }
      handleClose();
    } catch (error: any) {
      console.log("ERROR_CREATE_chapter", { error });
      message.error(error?.response?.data?.error);
    }
    setLoading(false);
    form.resetFields();
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
        setValues({
          name: "",
          subject: "",
        });
      }}
    >
      <Form
        form={form}
        id="ChapterForm"
        layout="vertical"
        onFinish={handleSubmit}
      >
        <div className={styles.inputFields}>
          <Form.Item name="name" rules={getRules("name")}>
            <Input
              id="chapterName"
              size="large"
              value={values.name}
              onChange={handleChangeValues}
              placeholder="Chapter Name"
              // variant="outlined"
            />
          </Form.Item>
          <Form.Item name="subject" rules={getRules("subject")}>
            <Select
              size="large"
              onChange={(e) => {
                console.log(e);
                setValues({ ...values, ["subject"]: e });
                console.log(values);
              }}
              id="subject"
              placeholder="Subject"
              disabled={editMode}
            >
              {/* {console.log(examOptions)} */}
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

export default CreateNewChapter;
