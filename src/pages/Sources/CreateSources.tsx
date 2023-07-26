import styles from "./Sources.module.scss";
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
import { SourceSchema } from "./utils/SourceModel";
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

interface CreateNewSourceProps {
  handleClose: () => void;
  toggleSideBar: boolean;
  setLoading: (loading: boolean) => void;
  setSources: any;
  title: string;
  editMode: boolean;
  selectedSource: any;
}

const CreateNewSource: React.FC<CreateNewSourceProps> = ({
  handleClose,
  toggleSideBar,
  setLoading,
  setSources,
  title,
  editMode,
  selectedSource,
}) => {
  const [form] = Form.useForm();
  const [values, setValues] = useState<any>({
    name: "",
  });
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { subjects: subjectOptions } = useContext(TestContext);

  const conversionObject: any = {
    name: null,
  };

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, SourceSchema),
      },
    ];
  }
  useEffect(() => {
    if (editMode && selectedSource) {
      console.log({ selectedSource });
      setValues({
        name: selectedSource?.name,
      });
      form.setFieldsValue({
        name: selectedSource?.name,
      });
    }
  }, [editMode, selectedSource]);
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
        SourceSchema,
        additionalValues
      );
      console.log("Final Data ->", { result });
      // console.log({ finalData });
      setLoading(true);
      console.log({ result, subjectOptions });

      if (!editMode) {
        const res = await API_QUESTIONS().post(`/source/create`, result);

        setSources((prev: any) => [
          ...prev,
          {
            ...result,
            _id: res?.data?._id,
          },
        ]);
        form.resetFields();
        message.success("Source Created Successfully");
      } else {
        console.log(selectedSource);
        result.id = selectedSource?._id;
        const res = await API_QUESTIONS().patch(`/source/update`, result);
        setSources((prev: any) => {
          const temp = [...prev];
          const index = temp.findIndex(
            (source: any) => source?._id === selectedSource?._id
          );
          temp[index] = result;
          return temp;
        });
        message.success("Source Updated Successfully");
      }
      handleClose();
    } catch (error: any) {
      console.log("ERROR_CREATE_source", { error });
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
        id="SourceForm"
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
              placeholder="Source Name"
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

export default CreateNewSource;
