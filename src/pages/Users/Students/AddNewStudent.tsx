import React, { useEffect, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
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
} from "antd";
import { UserProps } from "../components";
import { z } from "zod";
import {
  StudentType,
  studentSchema,
  userSchema,
} from "../../../utils/schemas/user";
import moment, { Moment } from "moment";
import { API_USERS } from "../../../utils/api";

const { Option } = Select;

const conversionObject: any = {
  name: null,
  email: null,
  password: null,
  dob: (value: Moment) =>
    value ? moment(value).format("DD-MM-YYYY") : undefined,
  gender: null,
  roles: null,
  contact: (value: any) => parseInt(value),
  city: null,
  state: null,
  address: null,
  institute: null,
  isEmailVerified: null,
  isPhoneVerified: null,
  userType: null,
  validity: (value: Moment[]) =>
    value
      ? {
          from: moment(value[0]).format("DD-MM-YYYY"),
          to: moment(value[1]).format("DD-MM-YYYY"),
        }
      : undefined,
  createdBy: null,
  createdAt: null,
  modifiedAt: null,
  parentDetails: {
    name: null,
    contact: (value: any) => parseInt(value),
  },
  batch: null,
  standard: (value: any) => parseInt(value),
  stream: null,
  medium: null,
  school: null,
  attemptedTests: null,
};

function convertFieldValue(key: string, value: any) {
  if (conversionObject[key] === null) return value;
  const keys = key.split(".");
  let currentConversionObject = conversionObject;

  for (const nestedKey of keys) {
    if (currentConversionObject[nestedKey]) {
      if (typeof currentConversionObject[nestedKey] === "function") {
        return currentConversionObject[nestedKey](value);
      } else if (typeof currentConversionObject[nestedKey] === "object") {
        currentConversionObject = currentConversionObject[nestedKey];
      }
    } else {
      return value;
    }
  }

  return value;
}

interface IAddNewStudent {
  student?: UserProps;
  title?: string;
  handleCloseModal: () => void;
  edit?: {
    values: any;
  };
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddNewStudent: React.FC<IAddNewStudent> = ({ setOpen, open }) => {
  const [form] = Form.useForm();
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const onClose = () => {
    setIsFormSubmitted(false);
    setOpen(false);
    form.resetFields();
  };

  function onFinish(values: any) {
    // console.log("Received values of form:", values);
  }

  function onFinishFailed(errorInfo: any) {
    // console.log("Failed:", errorInfo);
  }

  function convertStringToValidationFormat(
    str: string,
    schema: z.ZodType<any, z.ZodTypeDef, any> = studentSchema
  ): z.ZodType<any, z.ZodTypeDef, any> {
    const keys = str.split(".");
    let currentSchema = schema;

    for (const key of keys) {
      if (currentSchema instanceof z.ZodObject) {
        currentSchema = currentSchema.shape[key];
      } else {
        throw new Error(`Invalid schema type for key: ${key}`);
      }
    }

    return currentSchema;
  }

  async function validateField(fieldName: any, fieldValue: any) {
    try {
      const parsedFieldValue = convertFieldValue(fieldName, fieldValue); // this will convert the value to the required format
      let desiredKey = fieldName;
      const nestedKeys = fieldName.split(".");
      if (nestedKeys.length > 1) {
        desiredKey = nestedKeys[nestedKeys.length - 1];
      }
      // convertStringToValidationFormat(fieldName).pick(c)
      const obejctToApplyAsyncParseTo = convertStringToValidationFormat(
        fieldName,
        studentSchema
      );

      obejctToApplyAsyncParseTo.parse(parsedFieldValue);
      return Promise.resolve(); // Validation successful
    } catch (error: any) {
      const errorMessage = error.errors[0].message;
      return Promise.reject(errorMessage); // Validation failed
    }
  }

  async function validateForm() {
    try {
      console.log("Validating form");
      setIsFormSubmitted(true);
      const values = await form.validateFields();
      // console.log("Validated values:", values);
      studentSchema.parse(values);
      onFinish(values);
    } catch (error) {
      // console.log("Validation error:", error);
      onFinishFailed(error);
    }
  }

  function getRules(fieldName: any) {
    if (isFormSubmitted) {
      return [
        {
          validateTrigger: "onSubmit",
          validator: (_: any, value: any) => validateField(fieldName, value),
        },
      ];
    }
    return [];
  }
  function handleFinishFailed(errorInfo: any) {
    // console.log("Failed:", errorInfo, form.getFieldsValue());
  }

  // useEffect(() => {
  //   async function getRolesOption() {
  //     const res = await API_USERS().get(`/roles/all`);

  //     console.log({ res: res.data });
  //     setRolesInfo((prev: any) => ({
  //       ...prev,
  //       options: res.data
  //         .map((item: any) => ({
  //           name: item.name,
  //           value: item.id,
  //         }))
  //         .filter((data: any) => {
  //           return permissions.includes("CREATE_" + data.value.slice(5));
  //         }),
  //       actual: res.data,
  //     }));
  //   }
  //   getRolesOption();
  // }, []);

  return (
    <>
      <Drawer
        title="Create a new account"
        width={720}
        onClose={onClose}
        open={open}
        bodyStyle={{ paddingBottom: 80 }}
        extra={
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => {
                document
                  .getElementById("studentUserForm")
                  ?.dispatchEvent(
                    new Event("submit", { cancelable: true, bubbles: true })
                  );
              }}
              type="primary"
              htmlType="submit"
            >
              Submit
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          id="studentUserForm"
          layout="vertical"
          onFinish={validateForm}
          onFinishFailed={handleFinishFailed}
        >
          <SectionHeader title="Personal Details" />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Name" rules={getRules("name")}>
                <Input placeholder="Please enter a name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={getRules("email")}>
                <Input
                  style={{ width: "100%" }}
                  type="email"
                  autoComplete="new-email"
                  placeholder="Please enter an email"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={getRules("password")}
              >
                <Input.Password placeholder="Please enter a password" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dob"
                label="Date of Birth"
                rules={getRules("dob")}
              >
                <DatePicker format="DD-MM-YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="gender"
                label="Gender"
                rules={getRules("gender")}
              >
                <Select placeholder="Please choose a gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact"
                label="Contact"
                rules={getRules("contact")}
              >
                <Input type="number" placeholder="Please enter a contact" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="address"
                label="Address"
                rules={getRules("address")}
              >
                <Input
                  style={{ width: "100%" }}
                  placeholder="Please enter an address"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="City" rules={getRules("city")}>
                <Input
                  style={{ width: "100%" }}
                  placeholder="Please enter a city"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="state" label="State" rules={getRules("state")}>
                <Input placeholder="Please enter a state" />
              </Form.Item>
            </Col>
          </Row>
          <SectionHeader title="Parent Details" divider="above" />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="parentName"
                label="Parent Name"
                rules={getRules("parentDetails.name")}
              >
                <Input
                  style={{ width: "100%" }}
                  placeholder="Please enter a name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="parentContact"
                label="Parent Contact"
                rules={getRules("parentDetails.contact")}
              >
                <Input
                  type="number"
                  style={{ width: "100%" }}
                  placeholder="Please enter a contact"
                />
              </Form.Item>
            </Col>
          </Row>
          <SectionHeader title="Academic Details" divider="above" />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="standard"
                label="Standard"
                rules={getRules("standard")}
              >
                <Select placeholder="Please choose a standard">
                  <Option value="11">11 th</Option>
                  <Option value="12">12 th</Option>
                  <Option value="13">Dropper</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="school"
                label="School"
                rules={getRules("school")}
              >
                <Input placeholder="Please enter an school name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="stream"
                label="Stream"
                rules={getRules("stream")}
              >
                <Select placeholder="Please choose a stream">
                  <Option value="PCM">PCM</Option>
                  <Option value="PCB">PCB</Option>
                  <Option value="Commerce">Commerce</Option>
                  <Option value="male">Other Stream 1</Option>
                  <Option value="female">Other Stream 2</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="medium"
                label="Medium"
                rules={getRules("medium")}
              >
                <Select placeholder="Please choose a medium">
                  <Option value="hindi">हिंदी</Option>
                  <Option value="english">English</Option>
                  <Option value="other">other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <SectionHeader title="Other Details" divider="above" />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="institute"
                label="Institute"
                rules={getRules("institute")}
              >
                <Input placeholder="Please enter an institute" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batch" label="Batch" rules={getRules("batch")}>
                <Select placeholder="Please choose a batch">
                  <Option value="batch1">Batch 1</Option>
                  <Option value="batch2">Batch 2</Option>
                  <Option value="batch3">Batch 3</Option>
                  <Option value="batch4">Batch 4</Option>
                  <Option value="batch5">Batch 5</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="userType"
                label="User Type"
                rules={getRules("userType")}
              >
                <Input placeholder="Please enter a valid User Type" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="validity"
                label="Validity"
                rules={getRules("validity")}
              >
                <DatePicker.RangePicker
                  format="DD-MM-YYYY"
                  style={{ width: "100%" }}
                  getPopupContainer={(trigger) => trigger.parentElement!}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roles" label="Roles" rules={getRules("roles")}>
                <Select mode="tags" placeholder="Please choose a role/s">
                  <Option value="admin">Admin</Option>
                  <Option value="student">Student</Option>
                  <Option value="teacher">Teacher</Option>
                  <Option value="operator">Operator</Option>
                  <Option value="manager">Manager</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          {/* <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="owner"
                label="Owner"
                rules={[{ required: true, message: "Please select an owner" }]}
              >
                <Select placeholder="Please select an owner">
                  <Option value="xiao">Xiaoxiao Fu</Option>
                  <Option value="mao">Maomao Zhou</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Type"
                rules={[{ required: true, message: "Please choose the type" }]}
              >
                <Select placeholder="Please choose the type">
                  <Option value="private">Private</Option>
                  <Option value="public">Public</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="approver"
                label="Approver"
                rules={[
                  { required: true, message: "Please choose the approver" },
                ]}
              >
                <Select placeholder="Please choose the approver">
                  <Option value="jack">Jack Ma</Option>
                  <Option value="tom">Tom Liu</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dateTime"
                label="DateTime"
                rules={[
                  { required: true, message: "Please choose the dateTime" },
                ]}
              >
                <DatePicker.RangePicker
                  style={{ width: "100%" }}
                  getPopupContainer={(trigger) => trigger.parentElement!}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="description"
                label="Description"
                rules={[
                  {
                    required: true,
                    message: "please enter url description",
                  },
                ]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="please enter url description"
                />
              </Form.Item>
            </Col>
          </Row> */}
        </Form>
      </Drawer>
    </>
  );
};
export default AddNewStudent;

const SectionHeader = ({
  title,
  divider,
}: {
  title: string;
  divider?: "above" | "below";
}) => (
  <>
    {divider === "above" && <Divider />}
    <p style={{ marginBottom: "1.5rem", fontSize: "1.1rem" }}>{title}</p>
    {divider === "below" && <Divider />}
  </>
);
