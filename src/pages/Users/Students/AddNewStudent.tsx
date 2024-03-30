import React, { useContext, useEffect, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Form,
  FormInstance,
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
import { UsersContext } from "../../../utils/contexts/UsersContext";

const { Option } = Select;

interface IAddNewStudent {
  student?: UserProps;
  title?: string;
  handleCloseModal: () => void;
  edit: boolean;
  current: any;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddNewStudent: React.FC<IAddNewStudent> = ({
  setOpen,
  open,
  edit,
  current,
  title,
}) => {
  // const [isAddingNewStudent, setIsAddingNewStudent] = useState(true);
  const [form] = Form.useForm();

  const [roleDetails, setRoleDetails] = useState<any>({
    options: [],
    actual: [],
  });
  const [roleValidity, setRoleValidity] = useState<any>({});
  const [validity, setValidity] = useState<any>({});
  const [roles, setRoles] = useState<any>([]);
  const [batchOptions, setBatchOptions] = useState<any>([]);
  const [instituteOptions, setInstituteOptions] = useState<any>([]);
  const [submitDisabled, setSubmitDisabled] = useState<boolean>(false);
  const [data, setData] = useState([]);
  const userCtx = useContext(AuthContext);

  const { fetchStudents } = useContext(UsersContext);
  const rolesAllowed = userCtx?.roles;
  let permissions: any = [];
  Object.values(rolesAllowed)?.map(
    (role: any) => (permissions = [...permissions, ...role.permissions])
  );
  // console.log({ current });
  useEffect(() => {
    if (edit) {
      form.setFieldsValue({
        name: current?.name,
        email: current?.email,
        password: current?.password,
        dob: dayjs(current?.dob, "DD-MM-YYYY"),
        gender: current?.gender,
        contact: current?.contact,
        address: current?.address,
        city: current?.city,
        state: current?.state,
        "parentDetails-name": current?.parentDetails?.name,
        "parentDetails-contact": current?.parentDetails?.contact,
        institute: current?.institute,
        standard: current?.standard,
        stream: current?.stream,
        medium: current?.medium,
        school: current?.school,
        batch: current?.batch,
        roles: current?.roles?.map((role: any) => role.id),
        validity: [
          dayjs(current?.validity?.from),
          dayjs(current?.validity?.to),
        ],
      });
      setValidity({
        from: dayjs(current?.validity?.from),
        to: dayjs(current?.validity?.to),
      });
      setRoles(current?.roles?.map((role: any) => role.id));
      let roleval = {};
      current?.roles?.map((role: any) => {
        roleval = {
          ...roleval,
          [role.id]: {
            from: dayjs(role.from),
            to: dayjs(role.to),
          },
        };
      });
      setRoleValidity(roleval);
    }
  }, [edit, current]);

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
              from: dayjs(thisRoleValidity.from).toISOString(),
              to: dayjs(thisRoleValidity.to).toISOString(),
            };
          } else {
            role = {
              id: role.id,
              from: dayjs(validity?.from).toISOString(),
              to: dayjs(validity?.to).toISOString(),
            };
          }
          return role;
        });
        return roles;
      },
      revert: (roles: any[]) => roles?.map((role: any) => role.id),
    },
    contact: {
      convert: (value: any) => value,
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
        value ? [dayjs(value.from), dayjs(value.to)] : [],
    },
    createdBy: null,
    createdAt: null,
    modifiedAt: null,

    parentDetails: {
      name: null,
      contact: {
        convert: (value: any) => value,
        revert: (value: number) => value.toString(),
      },
    },
    batch: null,
    standard: null,
    stream: null,
    medium: null,
    school: null,
    attemptedTests: null,

    //Field to be removed later
    promoCode: null,
  };

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await API_USERS().get(`/class/all`);
        console.log({ res });
        setData(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_Classes", error);
        message.error("Error fetching Classes");
      }
    }
    fetchClasses();
  }, []);

  const onClose = () => {
    setOpen(false);
    setRoles([]);
    form.resetFields();
  };

  async function onFinish(values: any) {
    const res = await API_USERS().post(`/student/create`, { ...values });
    message.success("Student created successfully");
    form.resetFields();
    console.log(res);
  }
  async function onUpdate(values: any) {
    const res = await API_USERS().patch(`/student/${current?.id}`, {
      ...values,
    });
    message.success("Student updated successfully");
    console.log(res);
  }

  function onFinishFailed(errorInfo: any) {
    if (errorInfo?.response?.data?.message) {
      message.error(errorInfo.response.data.message);
    } else {
      message.error("Error in creating student");
    }
    console.log("createStudent onFinishFailed:", errorInfo);
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
        // promoCode: (() => {
        //   const batch = batchOptions.find(
        //     (batch: { value: string; label: string; promoCode: string }) =>
        //       batch.value === form.getFieldValue("batch")
        //   );
        //   return batch.promoCode;
        // })(),
        promoCode: "VIA_ADMIN",
      };
      console.log({ additionalValues });
      const result = performZodValidation(
        form,
        conversionObject,
        studentSchema,
        additionalValues
      );
      console.log({ result });
      if (!edit) {
        await onFinish(result);
        setRoles([]);
        setValidity({});
        setRoleValidity({});
      } else {
        await onUpdate(result);
      }
      await fetchStudents();
    } catch (error) {
      onFinishFailed(error);
    }
  }

  function getRules(fieldName: any) {
    try {
      return [
        {
          validateTrigger: "onSubmit",
          validator: (_: any, value: any) =>
            validateField(fieldName, value, conversionObject, studentSchema),
        },
      ];
    } catch (e) {
      console.log(e);
    }
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
      const requestedFields = "name,id,promoCode";
      const res = await API_USERS().get(`/batch/all?fields=${requestedFields}`);
      setBatchOptions(
        res.data?.map((item: any) => ({
          label: item.name,
          value: item._id,
          promoCode: item.promoCode,
        }))
      );
    }
    async function fetchInstitutes() {
      try {
        const res = await API_USERS().get(`/institute/get`);
        console.log({ res });
        setInstituteOptions(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_Institutes", error);
        message.error("Error fetching Institutes");
      }
    }

    // getBatchOption();
    // getRolesOption();
    // fetchInstitutes();
    const allPromises = [getBatchOption(), getRolesOption(), fetchInstitutes()];
    Promise.all(allPromises).then((res) => {
      console.log("Master data fetched");
    });
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
  const handleFinishFailed = (errorInfo: any) => {
    console.log("Failed:", errorInfo);
  };

  return (
    <>
      <Drawer
        title={title}
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
                <DatePicker
                  format="DD-MM-YYYY"
                  disabledDate={(current) => {
                    return current && current.valueOf() > Date.now();
                  }}
                  style={{ width: "100%" }}
                />
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
                <Select
                  showSearch
                  placeholder="Please choose a gender"
                  optionLabelProp="label"
                >
                  <Option value="male" label="Male">
                    Male
                  </Option>
                  <Option value="female" label="Female">
                    Female
                  </Option>
                  <Option value="other" label="Other">
                    Other
                  </Option>
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
                <Select
                  showSearch
                  placeholder="Please enter a state"
                  filterOption={(input: any, option: any) =>
                    (option?.label?.toLowerCase() ?? "").includes(
                      input.toLowerCase()
                    )
                  }
                >
                  {INDIAN_STATES.map((e) => (
                    <Select.Option key={e} value={e} label={e}>
                      {e}
                    </Select.Option>
                  ))}
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
                <Select
                  showSearch
                  placeholder="Please choose a standard"
                  filterOption={(input: any, option: any) =>
                    (option?.label?.toLowerCase() ?? "").includes(
                      input.toLowerCase()
                    )
                  }
                >
                  {data?.map((e: any) => (
                    <Select.Option value={e.name} label={e.name}>
                      {e.name}
                    </Select.Option>
                  ))}
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
                <Select
                  showSearch
                  placeholder="Please choose a stream"
                  filterOption={(input: any, option: any) =>
                    (option?.label?.toLowerCase() ?? "").includes(
                      input.toLowerCase()
                    )
                  }
                >
                  <Option value="PCM" label="PCM">
                    PCM
                  </Option>
                  <Option value="PCB" label="PCB">
                    PCB
                  </Option>
                  <Option value="Commerce" label="Commerce">
                    Commerce
                  </Option>
                  <Option value="other1" label="Other Stream 1">
                    Other Stream 1
                  </Option>
                  <Option value="other2" label="Other Stream 2">
                    Other Stream 2
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="medium"
                label="Medium"
                rules={getRules("medium")}
              >
                <Select
                  showSearch
                  placeholder="Please choose a medium"
                  optionLabelProp="label"
                >
                  <Option value="hindi" label="हिंदी">
                    हिंदी
                  </Option>
                  <Option value="english" label="English">
                    English
                  </Option>
                  <Option value="other" label="other">
                    other
                  </Option>
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
                {/* <Input placeholder="Please enter an institute" /> */}
                <Select
                  showSearch
                  placeholder="Please choose an institute"
                  filterOption={(input: any, option: any) =>
                    (option?.label?.toLowerCase() ?? "").includes(
                      input.toLowerCase()
                    )
                  }
                >
                  {instituteOptions?.map((option: any) => (
                    <Select.Option
                      key={option.name}
                      value={option.name}
                      label={option.name}
                    >
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="batch"
                label="Batch"
                rules={getRules("promoCode")}
              >
                <Select
                  showSearch
                  placeholder="Please choose a batch"
                  filterOption={(input: any, option: any) =>
                    (option?.label?.toLowerCase() ?? "").includes(
                      input.toLowerCase()
                    )
                  }
                >
                  {batchOptions?.map((option: any) => (
                    <Select.Option
                      key={option.value}
                      value={option.value}
                      label={option.label}
                    >
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <SectionHeader title="Validity" divider="above" />
          <Row gutter={16}>
            {/* <Col span={12}>
              <Form.Item
                name="userType"
                label="User Type"
                rules={getRules("userType")}
              >
                <Select showSearch placeholder="Please choose a user type">
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
                  mode="multiple"
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
            {roles?.length > 0 && (
              <RolesTable
                updateValidity={updateRoleValidity}
                roles={roles}
                roleValidity={roleValidity}
              />
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
