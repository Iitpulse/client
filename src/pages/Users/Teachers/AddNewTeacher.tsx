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
import RolesTable from "../components/RolesTable";
import { ROLES } from "../../../utils/constants";
const { Option } = Select;

interface IAddNewTeacher {
  teacher?: UserProps;
  title?: string;
  handleCloseModal: () => void;
  edit?: {
    values: any;
  };
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddNewTeacher: React.FC<IAddNewTeacher> = ({ setOpen, open }) => {
  const [form] = Form.useForm();
  // const [isAddingNewStudent, setIsAddingNewStudent] = useState(true);
  const [roleDetails, setRoleDetails] = useState<any>({
    options: [],
    actual: [],
  });
  const [subjectOptions, setSubjectOptions] = useState<any>({
    options: [],
    actual: [],
  });

  const [roleValidity, setRoleValidity] = useState<any>({});
  const [validity, setValidity] = useState<any>({});
  const [roles, setRoles] = useState<any>([]);
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
    isEmailVerified: null,
    isPhoneVerified: null,
    institute: null,
    userType: () => "teacher",
    address: null,
    validity: {
      convert: (value: Dayjs[]) =>
        value
          ? {
              from: dayjs(value[0]).toISOString(),
              to: dayjs(value[1]).toISOString(),
            }
          : undefined,
      revert: (value: { from: string; to: string }) =>
        value
          ? [dayjs(value.from, "DD-MM-YYYY"), dayjs(value.to, "DD-MM-YYYY")]
          : [],
    },
    subjects: {
      convert: (values: string[]) => {
        const subjects = values?.map((value: string) => {
          const subject = subjectOptions.actual.find(
            (subject: any) => subject._id === value
          );
          return subject;
        });
        return subjects;
      },
      revert: (subjects: any[]) => subjects?.map((subject: any) => subject._id),
    },

    gender: null,
    roles: {
      convert: (values: string[]) => {
        const roles = values?.map((value: string) => {
          let role = roleDetails.actual.find((role: any) => role.id === value);
          let thisRoleValidity = roleValidity[value];
          if (thisRoleValidity) {
            role = {
              id: role.id,
              from: thisRoleValidity.from,
              to: thisRoleValidity.to,
            };
          } else {
            role = {
              id: role.id,
              from: validity?.from,
              to: validity?.to,
            };
          }
          return role;
        });
        return roles;
      },
      revert: (roles: any[]) => roles?.map((role: any) => role.id),
    },
    previousTests: null,
    createdBy: null,
    createdAt: null,
    modifiedAt: null,
  };

  const onClose = () => {
    setOpen(false);
    form.resetFields();
  };

  async function onFinish(values: any) {
    const res = await API_USERS().post(`/teacher/create`, { ...values });
    message.success("Teacher created successfully");
    console.log(res);
  }

  function onFinishFailed(errorInfo: any) {
    message.error("Teacher creation failed");
    console.log("Failed:", errorInfo);
  }

  async function validateForm() {
    try {
      const additionalValues = {
        userType: "teacher",
        createdBy: {
          id: userCtx?.currentUser?.id,
          userType: userCtx?.currentUser?.userType,
        },
        createdAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
        modifiedAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
        previousTests: [],
        isEmailVerified: false,
        isPhoneVerified: false,
        // subjects: [],
      };
      const result = performZodValidation(
        form,
        conversionObject,
        teacherSchema,
        additionalValues
      );
      const hasTeacher =
        !result?.roles ||
        !result?.roles?.find((role: any) => role.id === ROLES.TEACHER);
      if (hasTeacher) {
        if (!result?.roles) result.roles = [];
        result.roles = [
          ...result?.roles,
          {
            id: ROLES.TEACHER,
            from: result.validity.from,
            to: result.validity.to,
          },
        ];
      }
      console.log(result);
      await onFinish(result);
      form.resetFields();
      setValidity({});
      setRoleValidity({});
      setRoles([]);
    } catch (error) {
      onFinishFailed(error);
    }
  }

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, teacherSchema),
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

    async function getSubjectsOption() {
      const res = await API_QUESTIONS().get(`/subject/subjects`);
      const options = res.data?.map((item: any) => ({
        label: item.name,
        value: item._id,
      }));
      const actual = res.data;
      console.log({ options, actual });
      setSubjectOptions({ options, actual });
    }

    getSubjectsOption();
    getRolesOption();
  }, []);
  function updateRoleValidity(id: string, value: any) {
    let rolesData = form.getFieldValue("roles");
    console.log(rolesData, value, roleDetails);

    setRoleValidity((prev: any) => {
      return {
        ...prev,
        [id]: {
          from: dayjs(value[0]).toISOString(),
          to: dayjs(value[1]).toISOString(),
        },
      };
    });
  }

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
                  .getElementById("teacherUserForm")
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
          id="teacherUserForm"
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
            <Col span={12}>
              <Form.Item
                name="subjects"
                label="Subjects"
                rules={getRules("subjects")}
              >
                <Select mode="tags" placeholder="Please choose a Subject/s">
                  {subjectOptions.options?.map((item: any) => (
                    <Select.Option key={item.value} value={item.value}>
                      {item.label}
                    </Select.Option>
                  ))}
                </Select>
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
                <Select
                  onChange={(e) => {
                    setRoles(e);
                  }}
                  mode="tags"
                  placeholder="Please choose a role/s"
                >
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
                  onChange={(e: any) => {
                    setValidity({
                      from: dayjs(e[0]).toISOString(),
                      to: dayjs(e[1]).toISOString(),
                    });
                  }}
                  format="DD-MM-YYYY"
                  style={{ width: "100%" }}
                  getPopupContainer={(trigger) => trigger.parentElement!}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row style={{ gap: "2.2rem" }}>
            {roles.length > 0 && (
              <RolesTable updateValidity={updateRoleValidity} roles={roles} />
            )}
            {/* </Col> */}
          </Row>
        </Form>
      </Drawer>
    </>
  );
};
export default AddNewTeacher;

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
