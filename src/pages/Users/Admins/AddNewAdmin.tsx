import React, { useContext, useEffect, useState } from "react";
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
  message,
} from "antd";
import { UserProps } from "../components";
import { z } from "zod";
import {
  StudentType,
  adminSchema,
  studentSchema,
  teacherSchema,
  userSchema,
} from "../../../utils/schemas/user";
import dayjs, { Dayjs } from "dayjs";
import { API_QUESTIONS, API_USERS } from "../../../utils/api/config";
import {
  convertFieldValue,
  convertStringToValidationFormat,
  mapIdWithValues,
  performZodValidation,
  validateField,
} from "../../../utils/schemas";
import { AuthContext } from "../../../utils/auth/AuthContext";
const { Option } = Select;

interface IAddNewAdmin {
  admin?: UserProps;
  title?: string;
  handleCloseModal: () => void;
  edit?: {
    values: any;
  };
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddNewAdmin: React.FC<IAddNewAdmin> = ({ setOpen, open }) => {
  const [form] = Form.useForm();
  // const [isAddingNewStudent, setIsAddingNewStudent] = useState(true);
  const [roleDetails, setRoleDetails] = useState<any>({
    options: [],
    actual: [],
  });
  const [subjectOptions, setSubjectOptions] = useState<any>([]);
  const userCtx = useContext(AuthContext);
  const rolesAllowed = userCtx?.roles;
  let permissions: any = [];
  Object.values(rolesAllowed)?.map(
    (role: any) => (permissions = [...permissions, ...role.permissions])
  );

  const conversionObject: any = {
    name: null,
    email: null,
    password: null,
    contact: {
      convert: (value: any) => parseInt(value),
      revert: (value: number) => value.toString(),
    },
    dob: {
      convert: (value: Dayjs) =>
        value ? dayjs(value).format("DD-MM-YYYY") : undefined,
      revert: (value: string) =>
        value ? dayjs(value, "DD-MM-YYYY").toDate() : null,
    },
    city: null,
    state: null,
    institute: null,
    userType: () => "teacher",
    address: null,
    validity: {
      convert: (value: Dayjs[]) =>
        value
          ? {
              from: dayjs(value[0]).format("DD-MM-YYYY"),
              to: dayjs(value[1]).format("DD-MM-YYYY"),
            }
          : undefined,
      revert: (value: { from: string; to: string }) =>
        value
          ? [dayjs(value.from, "DD-MM-YYYY"), dayjs(value.to, "DD-MM-YYYY")]
          : [],
    },

    gender: null,
    roles: {
      convert: (values: string[]) => {
        const roles = values?.map((value: string) => {
          const role = roleDetails.actual.find(
            (role: any) => role.id === value
          );
          return role;
        });
        return roles;
      },
      revert: (roles: any[]) => roles?.map((role: any) => role.id),
    },

    createdBy: null,
    createdAt: null,
    modifiedAt: null,
  };

  const onClose = () => {
    setOpen(false);
    form.resetFields();
  };

  async function onFinish(values: any) {
    const res = await API_USERS().post(`/admin/create`, { ...values });
    message.success("admin created successfully");
    console.log(res);
  }

  function onFinishFailed(errorInfo: any) {
    message.error("admin creation failed");
    console.log("Failed:", errorInfo);
  }

  async function validateForm() {
    try {
      const additionalValues = {
        userType: "admin",
        createdBy: {
          id: userCtx?.currentUser?.id,
          userType: userCtx?.currentUser?.userType,
        },
        isEmailVerified: false,
        isPhoneVerified: false,
        createdAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
        modifiedAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
      };
      const result = performZodValidation(
        form,
        conversionObject,
        adminSchema,
        additionalValues
      );
      console.log({ result });
      await onFinish(result);
    } catch (error) {
      onFinishFailed(error);
    }
  }

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, studentSchema),
      },
    ];
  }

  useEffect(() => {
    async function getRolesOption() {
      const res = await API_USERS().get(`/roles/all`);
      const options = res.data?.map((item: any) => ({
        label: item.name,
        value: item.id,
      }));
      const actual = res.data;
      setRoleDetails({ options, actual });
    }

    getRolesOption();
  }, []);

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
                  .getElementById("adminUserForm")
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
          id="adminUserForm"
          layout="vertical"
          onFinish={validateForm}
          // onFinishFailed={handleFinishFailed}
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
            </Col>{" "}
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
          </Row>
          <Row gutter={16}>
            {/* <Col span={12}>
              <Form.Item
                name="userType"
                label="User Type"
                rules={getRules("userType")}
              >
                <Select placeholder="Please choose a user type">
                  <Option value="admin">Admin</Option>
                  <Option value="student">Student</Option>
                  <Option value="teacher">Teacher</Option>
                  <Option value="operator">Operator</Option>
                  <Option value="manager">Manager</Option>
                </Select>
              </Form.Item>
            </Col> */}
            <Col span={12}>
              <Form.Item name="roles" label="Roles" rules={getRules("roles")}>
                <Select mode="tags" placeholder="Please choose a role/s">
                  {roleDetails.options?.map((option: any) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
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
        </Form>
      </Drawer>
    </>
  );
};
export default AddNewAdmin;

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
