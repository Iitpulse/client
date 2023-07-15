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
  setTopics: any;
  title: string;
  editMode: boolean;
  selectedTopic: any;
}

const CreateNewTopic: React.FC<CreateNewTopicProps> = ({
  handleClose,
  toggleSideBar,
  setLoading,
  setTopics,
  title,
  editMode,
  selectedTopic,
}) => {
  const [form] = Form.useForm();
  const [values, setValues] = useState<any>({
    name: "",
    subject: "",
    chapter: "",
    oldTopic:"",
  });
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { subjects: subjectOptions } = useContext(TestContext);
  const [chapterList, setChapterList] = useState<any>([]);
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const res = await API_QUESTIONS().get(
          `/subject/chapter?subject=${values.subject}`
        );
        console.log({ res });
        setChapterList(res?.data?.map((chap: { name: string }) => chap?.name));
      } catch (error) {
        console.log({ error });
      }
    };
    if (values.subject) {
      fetchChapters();
    }
  }, [values.subject]);
  console.log(chapterList);
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
          validateField(fieldName, value, conversionObject, TopicSchema),
      },
    ];
  }
  useEffect(() => {
    if (editMode && selectedTopic) {
      console.log({ selectedTopic });
      setValues({
        name: selectedTopic?.topic,
        subject: selectedTopic?.subject,
        chapter: selectedTopic?.chapter,
        oldTopic: selectedTopic?.topic,
      });
      form.setFieldsValue({
        name: selectedTopic?.topic,
        subject: selectedTopic?.subject,
        chapter: selectedTopic?.chapter,
      });
    }
  }, [editMode, selectedTopic]);
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
      )._id;
      setLoading(true);
      console.log({ result, subjectOptions });

      if (!editMode) {
        const res = await API_QUESTIONS().post(`/subject/create-topic`, result);
        // const res = await API_QUESTIONS().post("/subject/create-topic", {
        //   subjectId: subject._id,
        //   topic: topicName,
        //   topic: topicName,
        // });
        setTopics((prev: any) => [
          ...prev,
          {
            topic: result.name,
            subjectId: result.subject,
            subject: values.subject,
            chapter: result.chapter,
          },
        ]);
        form.resetFields();
        message.success(res?.data?.status);
      } else {
        console.log(selectedTopic);
        result.id = selectedTopic?._id;
        result.oldTopic = values.oldTopic;
        const res = await API_QUESTIONS().patch(`/subject/update-topic`, result);
        console.log({res});
        setTopics((prev: any) => {
          const temp = [...prev];
          const index = temp.findIndex(
            (topic: any) => topic?.id === selectedTopic?.id
          );
          temp[index] = {
            name: result.name,
            subject: values.subject,
            chapter: result.chapter,
          };
          return temp;
        });
        message.success(res?.data?.message);
      }
      handleClose();
    } catch (error: any) {
      console.log("ERROR_CREATE_topic", { error });
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
        id="TopicForm"
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
              placeholder="Topic Name"
              // variant="outlined"
            />
          </Form.Item>

          <Form.Item name="subject" rules={getRules("subject")}>
            <Select
              size="large"
              onChange={(e) => {
                setValues((prev: any) => ({ ...prev, ["subject"]: e }));
                form.setFieldsValue({chapter: ""});
              }}
              id="subject"
              placeholder="Subject"
              value={values.subject}
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

          <Form.Item name="chapter" rules={getRules("chapter")}>
            <Select
              size="large"
              onChange={(e) => {
                console.log(e);
                setValues((prev: any) => ({ ...prev, ["chapter"]: e }));
              }}
              id="chapter"
              placeholder="Chapter"
              value={values.chapter}
              disabled={(values?.subject === ""?true:false) || (editMode)}
            >
              {/* {console.log(examOptions)} */}
              {chapterList?.map((option: any, index: number) => (
                <Select.Option key={index} value={option}>
                  {option}
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

export default CreateNewTopic;
