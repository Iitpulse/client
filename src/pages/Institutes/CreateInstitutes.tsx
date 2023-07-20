import styles from "./Institutes.module.scss";
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
import { InstituteSchema } from "./utils/InstituteModel";
import Title from "antd/es/typography/Title";
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

interface CreateNewInstituteProps {
  handleClose: () => void;
  toggleSideBar: boolean;
  setLoading: (loading: boolean) => void;
  setInstitutes: any;
  title: string;
  editMode: boolean;
  selectedInstitute: any;
}

const CreateNewInstitute: React.FC<CreateNewInstituteProps> = ({
  handleClose,
  toggleSideBar,
  setLoading,
  setInstitutes,
  title,
  editMode,
  selectedInstitute,
}) => {
  const [form] = Form.useForm();
  const [values, setValues] = useState<any>({
    name: "",
    email: "",
    address: "",
    pocName: "",
    pocEmail: "",
    pocPhone: "",
    phone: "",
  });
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { subjects: subjectOptions } = useContext(TestContext);

  const conversionObject: any = {
    name: null,
    email: null,
    address: null,
    pocName: null,
    pocEmail: null,
    pocPhone: null,
    phone: null,
  };

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, InstituteSchema),
      },
    ];
  }
  useEffect(() => {
    if (editMode && selectedInstitute) {
      console.log({ selectedInstitute });
      setValues({
        name: selectedInstitute?.name,
        email: selectedInstitute?.email,
        address: selectedInstitute?.address,
        pocName: selectedInstitute?.poc?.name,
        pocEmail: selectedInstitute?.poc?.email,
        pocPhone: selectedInstitute?.poc?.phone?.toString(),
        phone: selectedInstitute?.phone?.toString(),
      });
      form.setFieldsValue({
        name: selectedInstitute?.name,
        email: selectedInstitute?.email,
        address: selectedInstitute?.address,
        pocName: selectedInstitute?.poc?.name,
        pocEmail: selectedInstitute?.poc?.email,
        pocPhone: selectedInstitute?.poc?.phone?.toString(),
        phone: selectedInstitute?.phone?.toString(),
      });
    }
  }, [editMode, selectedInstitute]);
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
        InstituteSchema,
        additionalValues
      );
      console.log("Final Data ->", { result });
      // console.log({ finalData });
      setLoading(true);
      console.log({ result, subjectOptions });

      if (!editMode) {
        const res = await API_USERS().post(`/institute/create`, {
          name: result.name,
          email: result.email,
          address: result.address,
          poc: {
            name: result.pocName,
            email: result.pocEmail,
            phone: result.pocPhone,
          },
          phone: result.phone,
          members: {},
          ...additionalValues,
        });
        console.log({ res });
        setInstitutes((prev: any) => [
          ...prev,
          {
            ...result,
            name: result.name,
            email: result.email,
            address: result.address,
            poc: {
              name: result.pocName,
              email: result.pocEmail,
              phone: result.pocPhone,
            },
            phone: result.phone,
            _id: res?.data?.data?._id,
            ...additionalValues,
          },
        ]);
        form.resetFields();
        message.success("Institute Created Successfully");
      } else {
        console.log(selectedInstitute);
        result.id = selectedInstitute?._id;
        const res = await API_USERS().put(`/institute/update`, {
          _id: selectedInstitute?._id,
          name: result.name,
          email: result.email,
          address: result.address,
          poc: {
            name: result.pocName,
            email: result.pocEmail,
            phone: result.pocPhone,
          },
          phone: result.phone,
          modifiedAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
        });
        setInstitutes((prev: any) => {
          const temp = [...prev];
          const index = temp.findIndex(
            (institute: any) => institute?._id === selectedInstitute?._id
          );
          temp[index] = {
            ...temp[index],
            ...result,
            name: result.name,
            email: result.email,
            address: result.address,
            poc: {
              name: result.pocName,
              email: result.pocEmail,
              phone: result.pocPhone,
            },
            phone: result.phone,
            modifiedAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
          };
          return temp;
        });
        message.success("Institute Updated Successfully");
      }
      handleClose();
    } catch (error: any) {
      console.log("ERROR_CREATE_institute", { error });
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
        id="InstituteForm"
        layout="vertical"
        onFinish={handleSubmit}
      >
        <div className={styles.inputFields}>
          <h3>Institute Details</h3>
          <Divider />
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
              placeholder="Institute Name"
              // variant="outlined"
            />
          </Form.Item>
          <Form.Item name="email" rules={getRules("email")}>
            <Input
              id="email"
              size="large"
              value={values.email}
              onChange={(e) => {
                setValues((prev: any) => ({
                  ...prev,
                  ["email"]: e.target.value,
                }));
              }}
              placeholder="Institute Email"
              // variant="outlined"
            />
          </Form.Item>
          <Form.Item name="address" rules={getRules("address")}>
            <Input
              id="address"
              size="large"
              value={values.address}
              onChange={(e) => {
                setValues((prev: any) => ({
                  ...prev,
                  ["address"]: e.target.value,
                }));
              }}
              placeholder="Institute Address"
              // variant="outlined"
            />
          </Form.Item>
          <Form.Item name="phone" rules={getRules("phone")}>
            <Input
              id="phone"
              size="large"
              value={values.phone}
              onChange={(e) => {
                setValues((prev: any) => ({
                  ...prev,
                  ["phone"]: e.target.value,
                }));
              }}
              placeholder="Institute Phone No."
              // variant="outlined"
            />
          </Form.Item>
          <h3>
            Point of Contact <small>(POC)</small>
          </h3>
          <Divider />
          <Form.Item name="pocName" rules={getRules("pocName")}>
            <Input
              id="pocName"
              size="large"
              value={values.pocName}
              onChange={(e) => {
                setValues((prev: any) => ({
                  ...prev,
                  ["pocName"]: e.target.value,
                }));
              }}
              placeholder="Name"
              // variant="outlined"
            />
          </Form.Item>
          <Form.Item name="pocEmail" rules={getRules("pocEmail")}>
            <Input
              id="pocEmail"
              size="large"
              value={values.pocEmail}
              onChange={(e) => {
                setValues((prev: any) => ({
                  ...prev,
                  ["pocEmail"]: e.target.value,
                }));
              }}
              placeholder="Email"
              // variant="outlined"
            />
          </Form.Item>
          <Form.Item name="pocPhone" rules={getRules("pocPhone")}>
            <Input
              id="pocPhone"
              size="large"
              value={values.pocPhone}
              onChange={(e) => {
                setValues((prev: any) => ({
                  ...prev,
                  ["pocPhone"]: e.target.value,
                }));
              }}
              placeholder="Phone"
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

export default CreateNewInstitute;
