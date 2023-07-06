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
  userSchema,
} from "../../../utils/schemas/user";
import dayjs, { Dayjs } from "dayjs";
import { API_USERS } from "../../../utils/api/config";
import {
  convertFieldValue,
  convertStringToValidationFormat,
  mapIdWithValues,
  performZodValidation,
  validateField,
} from "../../../utils/schemas";
import { AuthContext } from "../../../utils/auth/AuthContext";
import RolesTable from "../components/RolesTable";
import { INDIAN_STATES } from "../../../utils/constants";

const { Option } = Select;

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
  // const [isAddingNewStudent, setIsAddingNewStudent] = useState(true);
  const [roleDetails, setRoleDetails] = useState<any>({
    options: [],
    actual: [],
  });
  const [roleValidity, setRoleValidity] = useState<any>({});
  const [validity, setValidity] = useState<any>({});
  const [roles, setRoles] = useState<any>([]);
  const [batchOptions, setBatchOptions] = useState<any>([]);
  const [submitDisabled, setSubmitDisabled] = useState<boolean>(false);

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
    dob: {
      convert: (value: Dayjs) =>
        value ? dayjs(value).format("DD-MM-YYYY") : undefined,
      revert: (value: string) =>
        value ? dayjs(value, "DD-MM-YYYY").toDate() : null,
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
    contact: {
      convert: (value: any) => parseInt(value),
      revert: (value: number) => value.toString(),
    },
    address: null,
    institute: null,
    city: null,
    state: null,
    isEmailVerified: null,
    isPhoneVerified: null,
    userType: () => "student",
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
    createdBy: null,
    createdAt: null,
    modifiedAt: null,
    parentDetails: {
      name: null,
      contact: {
        convert: (value: any) => parseInt(value),
        revert: (value: number) => value.toString(),
      },
    },
    batch: null,
    standard: {
      convert: (value: any) => parseInt(value),
      revert: (value: number) => value.toString(),
    },
    stream: null,
    medium: null,
    school: null,
    attemptedTests: null,

    //Field to be removed later
    joiningCode: null,
  };

  const onClose = () => {
    setOpen(false);
    form.resetFields();
  };

  async function onFinish(values: any) {
    const res = await API_USERS().post(`/student/create`, { ...values });
    message.success("Student created successfully");
    form.resetFields();
    console.log(res);
  }

  function onFinishFailed(errorInfo: any) {
    message.error(errorInfo.response.data.message);
    console.log("Failed:", errorInfo.response.data.message);
  }

  async function validateForm() {
    try {
      const additionalValues = {
        userType: "student",
        createdBy: {
          id: userCtx?.currentUser?.id,
          userType: userCtx?.currentUser?.userType,
        },
        createdAt: dayjs().toISOString(),
        modifiedAt: dayjs().toISOString(),
        attemptedTests: [],
        isEmailVerified: null,
        isPhoneVerified: null,
        //Field to be removed later
        joiningCode: (() => {
          const batch = batchOptions.find(
            (batch: { value: string; label: string; joiningCode: string }) =>
              batch.value === form.getFieldValue("batch")
          );
          return batch.joiningCode;
        })(),
      };
      const result = performZodValidation(
        form,
        conversionObject,
        studentSchema,
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
      let actual = res.data;

      setRoleDetails({ options, actual });
    }
    async function getBatchOption() {
      const requestedFields = "name,id,joiningCode";
      const res = await API_USERS().get(`/batch/all?fields=${requestedFields}`);
      setBatchOptions(
        res.data?.map((item: any) => ({
          label: item.name,
          value: item._id,
          joiningCode: item.joiningCode,
        }))
      );
    }
    getBatchOption();
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
              onClick={async () => {
                setSubmitDisabled(true);
                await document
                  .getElementById("studentUserForm")
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
          </Space>
        }
      >
        <Form
          form={form}
          id="studentUserForm"
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="dob"
                label="Date of Birth"
                rules={getRules("dob")}
              >
                <DatePicker format="DD-MM-YYYY" disabledDate={(current)=>{return current && current.valueOf() > Date.now();}} style={{ width: "100%" }} />
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
                <Select placeholder="Please enter a state">
                  {
                    INDIAN_STATES.map((e)=>(
                      <Select.Option key={e} value={e}>{e}</Select.Option>
                    ))
                  }
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <SectionHeader title="Parent Details" divider="above" />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="parentDetails-name"
                label="Parent Name"
                rules={getRules("parentDetails-name")}
              >
                <Input
                  style={{ width: "100%" }}
                  placeholder="Please enter a name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="parentDetails-contact"
                label="Parent Contact"
                rules={getRules("parentDetails-contact")}
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
              <Form.Item
                name="batch"
                label="Batch"
                rules={getRules("joiningCode")}
              >
                <Select placeholder="Please choose a batch">
                  {batchOptions?.map((option: any) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
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
                  mode="tags"
                  placeholder="Please choose a role/s"
                  onChange={(e) => {
                    setRoles(e);
                  }}
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
                  format="DD-MM-YYYY"
                  style={{ width: "100%" }}
                  getPopupContainer={(trigger) => trigger.parentElement!}
                  onChange={(e: any) => {
                    setValidity({
                      from: dayjs(e[0]).toISOString(),
                      to: dayjs(e[1]).toISOString(),
                    });
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row style={{ gap: "2.2rem" }}>
            {roles.length > 0 && (
              <RolesTable updateValidity={updateRoleValidity} roles={roles} />
            )}
          </Row>
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
