import styles from "./Topics.module.scss";
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
import { TopicSchema } from "./utils/TopicModel";
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

interface CreateNewTopicProps {
  handleClose: () => void;
  toggleSideBar: boolean;
  setLoading: (loading: boolean) => void;
  setChapters: any;
  title: string;
  editMode: boolean;
  selectedChapter: any;
}

const CreateNewTopic: React.FC<CreateNewTopicProps> = ({
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
    chapter: ""
  });
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { subjects: subjectOptions } = useContext(TestContext);
  const [chaptersList, setChaptersList] = useState<Array<string>>([]);

  const conversionObject: any = {
    name: null,
  };

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, TopicSchema),
      },
    ];
  }
  useEffect(() => {
    if (editMode && selectedChapter) {
      console.log({ selectedChapter });
      setValues({
        name: selectedChapter?.name,
        subject: selectedChapter?.subject,
        chapter: selectedChapter?.chapter,
      });
      form.setFieldsValue({
        name: selectedChapter?.name,
        subject: selectedChapter?.subject,
        chapter: selectedChapter?.chapter,
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
        TopicSchema,
        additionalValues
      );
      console.log("Final Data ->", { result });
      // console.log({ finalData });
      result.subject = subjectOptions.find(
        (subject: any) => subject.name === result.subject
      ).id;
      setLoading(true);
      console.log({ result });
      if (!editMode) {
        const res = await API_QUESTIONS().post(`/subject/create-topic`, result);
        // const res = await API_QUESTIONS().post("/subject/create-topic", {
        //   subjectId: subject._id,
        //   chapter: chapterName,
        //   topic: topicName,
        // });
        setChapters((prev: any) => [...prev, res?.data?.data]);
        form.resetFields();
        message.success(res?.data?.message);
      } else {
        console.log(selectedChapter);
        result.id = selectedChapter?._id;
        const res = await API_QUESTIONS().patch(`/subject/chapters`, result);
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
        id="ChapterForm"
        layout="vertical"
        onFinish={handleSubmit}
      >
        <div className={styles.inputFields}>
          <Form.Item name="name" rules={getRules("name")}>
            <Input
              id="chapterName"
              size="large"
              value={values.chapterName}
              onChange={(e)=>{
                setValues((prev:any)=>({...prev, ["name"]:e.target.value}))
              }}
              placeholder="Chapter Name"
              // variant="outlined"
            />
          </Form.Item>
          
          <Form.Item name="Subject" rules={getRules("subject")}>
            <Select
              size="large"
              onChange={(e)=>{
                setValues((prev:any)=>({...prev, ["subject"]:e}))
              }}
              id="subject"
              placeholder="Subject"
              value={values.subject}
            >
              {/* {console.log(examOptions)} */}
              {subjectOptions?.map((option: any) => (
                <Select.Option key={option.id} value={option.name}>
                  {option.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="Chapter" rules={getRules("chapter")}>
            <Select
              size="large"
              onChange={(e)=>{
                console.log(e);
                setValues((prev:any)=>({...prev, ["chapter"]:e}))
              }}
              id="chapter"
              placeholder="Chapter"
              value={values.chapter}
              disabled={values?.subject?.length == 0? true:false}
            >
              {/* {console.log(examOptions)} */}
              {chaptersList?.map((option: any) => (
                <Select.Option key={option.id} value={option.name}>
                  {option.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className={styles.buttons}>
            <Button
              onClick={async () => {
                setSubmitDisabled(true);
                await document
                  .getElementById("ChapterForm")
                  ?.dispatchEvent(
                    new Event("submit", { cancelable: true, bubbles: true })
                  );
                setSubmitDisabled(false);
              }}
              type="primary"
              htmlType="submit"
              disabled={submitDisabled}
            >
              Submit
            </Button>
          </div>
        </div>
      </Form>
    </Sidebar>
  );
};

export default CreateNewTopic;
