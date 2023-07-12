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
  const [values, setValues] = useState<any>({});
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { chapters: chapterOptions } = useContext(TestContext);
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
          validateField(fieldName, value, conversionObject, ChapterSchema),
      },
    ];
  }
  useEffect(() => {
    if (editMode && selectedChapter) {
      form.setFieldsValue({
        name: selectedChapter?.name,
        chapters: selectedChapter?.chapters?.map((chapter: any) => {
          return chapter.name;
        }),
      });
      setValues({
        name: selectedChapter?.name,
        chapters: selectedChapter?.chapters?.map((chapter: any) => {
          return chapter.name;
        }),
      });
    }
  }, [editMode, selectedChapter]);
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
      result.chapters = result.chapters.map((chapter: any) => {
        return chapterOptions.find((option: any) => option.name === chapter);
      });
      setLoading(true);
      console.log({ result });
      if (!editMode) {
        const res = await API_QUESTIONS().post(`/chapter/create`, result);
        setChapters((prev: any) => [...prev, res?.data?.data]);
        form.resetFields();
        message.success(res?.data?.message);
      } else {
        console.log(selectedChapter);
        result.id = selectedChapter?._id;
        const res = await API_QUESTIONS().patch(`/chapter/chapters`, result);
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
      width="350px"
      handleClose={() => {
        handleClose();
        form.resetFields();
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
              onChange={handleChangeValues}
              placeholder="Chapter Name"
              // variant="outlined"
            />
          </Form.Item>
          <Form.Item name="chapters" rules={getRules("chapters")}>
            <Select
              size="large"
              onChange={(e) => {
                setValues({ ...values, ["chapters"]: e });
                // console.log(values);
              }}
              id="chapters"
              mode="tags"
              placeholder="Chapter(s)"
            >
              {/* {console.log(examOptions)} */}
              {chapterOptions?.map((option: any) => (
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

export default CreateNewChapter;
