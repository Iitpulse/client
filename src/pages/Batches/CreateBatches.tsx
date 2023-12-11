import styles from "./Batches.module.scss";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../utils/auth/AuthContext";
import { API_USERS } from "../../utils/api/config";
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
import { batchSchema } from "./utils/BatchModel";
// import {
//     Button,
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

interface CreateNewBatchProps {
  handleClose: () => void;
  toggleSideBar: boolean;
  setLoading: (loading: boolean) => void;
  setBatches: any;
  editMode: boolean;
  selectedBatch: any;
}

const CreateNewBatch: React.FC<CreateNewBatchProps> = ({
  handleClose,
  toggleSideBar,
  setLoading,
  editMode,
  selectedBatch,
  setBatches,
}) => {
  const [form] = Form.useForm();
  const [batch, setBatch] = useState();
  const [validity, setValidity] = useState({} as any);
  const [classes, setClasses] = useState<any>([]);
  const [roleOptions, setRoleOptions] = useState<any>([]);
  const [roles, setRoles] = useState<any>([]);
  const [values, setValues] = useState({} as any);

  const { currentUser } = useContext(AuthContext);
  const { allRoles } = useContext(PermissionsContext);
  const { exams: examOptions } = useContext(TestContext);

  useEffect(() => {
    if (allRoles) {
      // console.log({ allRoles });
      const options = allRoles.map((value: any) => ({
        value: value.id,
        name: value.name,
      }));
      setRoleOptions(options);
    }
  }, [allRoles]);
  useEffect(() => {
    if (editMode) {
      console.log({ selectedBatch });
      const { name, exams, medium, validity, classes, roles, promoCode } = selectedBatch;
      setValues({
        name,
        exams,
        medium,
        validity,
        classes,
        roles,
        promoCode,
      });
      setValidity({
        from: dayjs(validity.from),
        to: dayjs(validity.to),
      });
      form.setFieldsValue({
        name,
        exams,
        medium,
        validity: [dayjs(validity.from), dayjs(validity.to)],
        classes,
        roles,
        promoCode,
      });
    } else{
      setValues({});
      setClasses([]);
      setRoles([]);
      form.resetFields();
    }
  }, [editMode]);
  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    // console.log(e.target)
    const { id, value } = e.target;
    // console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  const conversionObject: any = {
    name: null,
    exams: null,
    medium: null,
    institute: null,
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
    classes: null,
    createdBy: null,
    createdAt: null,
    modifiedAt: null,
    roles: null,
    promoCode: null,
  };

  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, batchSchema),
      },
    ];
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // handleReset();
    // e.preventDefault();
    //   setLoading(true);
    try {
      // const finalData = {
      //     name: values.batchName,
      //     // exams: values.exams?.map((exam: any) => exam.name),
      //     exams: values.exams,
      //     medium: values.medium,
      //     institute: currentUser?.instituteId,
      //     validity: {
      //         from: dayjs(validity[0]).toISOString(),
      //         to: dayjs(validity[1]).toISOString(),
      //     },
      //     // classes: classes.map((value: any) => value.name),
      //     classes: values.classes,
      //     createdBy: {
      //         id: currentUser?.id,
      //         userType: currentUser?.userType,
      //     },
      //     createdAt: new Date().toISOString(),
      //     modifiedAt: new Date().toISOString(),
      //     members: [],
      //     roles: values.roles,
      //     // roles: roles.map((value: any) => value.value),
      // };
      console.log({validity});
      // const from = dayjs(validity[0]).toISOString();
      // const to = dayjs(validity[1]).toISOString();
      const additionalValues = {
        institute: currentUser?.instituteId,
        createdBy: {
          id: currentUser?.id,
          userType: currentUser?.userType,
        },
        createdAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
        modifiedAt: dayjs().format("DD-MM-YYYY HH:mm:ss"),
        members: [],
      };
      console.log("form->", { form });
      const result = performZodValidation(
        form,
        conversionObject,
        batchSchema,
        additionalValues
      );
      // result.validity.to = to;
      // result.validity.from = from;
      console.log("Final Data ->", { result });
      // console.log({ finalData });
      if (!editMode) {
        const res = await API_USERS().post(`/batch/create`, result);
        setBatches((prev: any) => [...prev, res?.data?.data]);
        setValues({});
        setClasses([]);
        setRoles([]);
        form.resetFields();
        message.success(res?.data?.message);
      } else {
        result.id = selectedBatch._id;
        console.log(result);
        const res = await API_USERS().put(`/batch/update/`, result);
        setBatches((prev: any) => {
          const index = prev.findIndex(
            (batch: any) => batch._id === selectedBatch._id
          );
          const updatedBatch = { ...prev[index], ...result };
          prev[index] = updatedBatch;
          return [...prev];
        });
        setValues({});
        setClasses([]);
        setRoles([]);
        form.resetFields();
        message.success(res?.data?.message);
      }
      handleClose();
    } catch (error: any) {
      console.log("ERROR_CREATE_BATCH", { error });
      // form.resetFields();
      message.error(error.response.data.error);
    }
    setLoading(false);
    // console.log({ res });
  }
  const options = [
    { value: "9", name: "9" },
    { value: "10", name: "10" },
    { value: "11", name: "11" },
    { value: "12", name: "12" },
    { value: "13", name: "dropper" },
  ];

  return (
    //   <Sidebar
    //     title="Create New Batch"
    //     open={toggleSideBar}
    //     width="350px"
    //     handleClose={handleClose}
    //   >
    <Sidebar
      title="Create New Batch"
      open={toggleSideBar}
      width="30%"
      handleClose={handleClose}
    >
      <Form
        form={form}
        id="teacherUserForm"
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* <div className={styles.inputFields}> */}
        <Form.Item name="name" rules={getRules("name")}>
          <Input
            id="batchName"
            size="large"
            value={values.batchName}
            onChange={handleChangeValues}
            placeholder="Batch Name"
            // variant="outlined"
          />
        </Form.Item>
        <Form.Item name="validity" rules={getRules("validity")}>
          <DatePicker.RangePicker
            format="DD-MM-YYYY"
            size="large"
            style={{ width: "100%" }}
            // getPopupContainer={(trigger) => trigger.parentElement!}
            onChange={(e: any) => {
              setValidity({
                from: dayjs(e[0]).toISOString(),
                to: dayjs(e[1]).toISOString(),
              });
              console.log(validity);
            }}
          />
        </Form.Item>
        <Form.Item name="exams" rules={getRules("exams")}>
          <Select
            size="large"
            onChange={(e) => {
              setValues({ ...values, ["exams"]: e });
              // console.log(values);
            }}
            id="Exams"
            mode="tags"
            placeholder="Exam(s)"
          >
            {/* {console.log(examOptions)} */}
            {examOptions?.map((option: any) => (
              <Select.Option key={option.id} value={option.name}>
                {option.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {/* <CreatableSelect
                multiple
                onAddModalSubmit={() => {}}
                options={examOptions.map((exam: any) => ({
                name: exam.name,
                }))}
                setValue={(vals: any) => {
                setValues({ ...values, exams: vals });
                }}
                value={values.exams}
                label={"Exam(s)"}
                id="Exams"
            /> */}
        <Form.Item name="medium" rules={getRules("medium")}>
          <Select
            showSearch
            id="Medium"
            size="large"
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={[
              {
                value: "hindi",
                label: "Hindi",
              },
              {
                value: "english",
                label: "English",
              },
            ]}
            onChange={(val: string) => {
              console.log(val);
              setValues({ ...values, ["medium"]: val });
            }}
            //   onChange={handleChangeValues}
            value={values.medium}
            placeholder="Medium"
          />
        </Form.Item>
        {/* <StyledMUISelect
                options={[
                    { name: "Hindi", value: "hindi" },
                    { name: "English", value: "english" },
                ]}
                value={values.medium}
                label="Medium"
                // @ts-ignore
                onChange={(val: string) => {
                    setValues({medium: val});
                }}
            /> */}

        <Form.Item name="classes" rules={getRules("classes")}>
          <Select
            size="large"
            id="Classes"
            onChange={(e) => {
              setValues({ ...values, ["classes"]: e });
            }}
            mode="tags"
            placeholder="Classes"
          >
            {/* {console.log(options)} */}
            {options?.map((option: any) => (
              <Select.Option key={option.id} value={option.name}>
                {option.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {/* <CreatableSelect
                multiple
                options={options}
                setValue={setClasses}
                value={classes}
                label={"Classes"}
                id="Classes"
                onAddModalSubmit={function (value: any): void {}}
            /> */}
        <Form.Item name="promoCode" rules={getRules("promoCode")}>
          <Select
            size="large"
            onChange={(e) => {
              console.log(values);
              setValues({ ...values, ["promoCode"]: e });
            }}
            id="promoCode"
            mode="tags"
            placeholder="Promo Codes(s)"
            // options={options}
          />
        </Form.Item>
        <Form.Item name="roles" rules={getRules("roles")}>
          <Select
            size="large"
            onChange={(e) => {
              console.log(values);
              setValues({ ...values, ["roles"]: e });
            }}
            id="Roles"
            mode="tags"
            placeholder="Roles(s)"
          >
            {/* {console.log(roleOptions)} */}
            {roleOptions?.map((option: any) => (
              <Select.Option key={option.id} value={option.name}>
                {option.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {/* <MUIChipsAutocomplete
                label="Role(s)"
                value={roles}
                options={roleOptions || []}
                onChange={setRoles}
                error={false}
                helperText=""
            /> */}
        {/* </div> */}
        {/* <div className={styles.buttons}> */}
        <Button
          onClick={async () => {
            // setSubmitDisabled(true);
            await document
              .getElementById("studentUserForm")
              ?.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true })
              );
            // setSubmitDisabled(false);
          }}
          type="primary"
          htmlType="submit"
          //   disabled={submitDisabled}
        >
          Submit
        </Button>
        {/* </div> */}
      </Form>
    </Sidebar>
  );
};

export default CreateNewBatch;
