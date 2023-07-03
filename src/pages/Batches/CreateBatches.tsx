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
import CustomDateRangePicker from "../../components/CustomDateRangePicker/CustomDateRangePicker";
import { styled, Box } from "@mui/system";
import { IconButton, TextField } from "@mui/material";
import MainLayout from "../../layouts/MainLayout";
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
    }


const CreateNewBatch = () => {
    const [batch, setBatch] = useState();
    const [validity, setValidity] = useState([]);
    const [classes, setClasses] = useState<any>([]);
    const [roleOptions, setRoleOptions] = useState<any>([]);
    const [roles, setRoles] = useState<any>([]);
    const [values, setValues] = useState({} as any);

    const { currentUser } = useContext(AuthContext);
    const { allRoles } = useContext(PermissionsContext);
    const { exams: examOptions } = useContext(TestContext);
    const [batches, setBatches] = useState<any>([]);

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

    function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
        // console.log(e.target)
        const { id, value } = e.target;
        // console.log({ id, value });
        setValues({ ...values, [id]: value });
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        // handleReset();
        // e.preventDefault();
    //   setLoading(true);
        try {
        const finalData = {
            name: values.batchName,
            // exams: values.exams?.map((exam: any) => exam.name),
            exams: values.exams,
            medium: values.medium,
            institute: currentUser?.instituteId,
            validity: {
                from: dayjs(validity[0]).toISOString(),
                to: dayjs(validity[1]).toISOString(),
            },
            // classes: classes.map((value: any) => value.name),
            classes: values.classes,
            createdBy: {
                id: currentUser?.id,
                userType: currentUser?.userType,
            },
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            members: [],
            roles: values.roles,
            // roles: roles.map((value: any) => value.value),
        };
        console.log("Final Data ->", {finalData});
        // console.log({ finalData });
        const res = await API_USERS().post(`/batch/create`, finalData);
        setBatches((prev: any) => [...prev, res?.data?.data]);
        setValues({});
        setClasses([]);
        setRoles([]);
        message.success(res?.data?.message);
        } catch (error: any) {
        console.log("ERROR_CREATE_BATCH", {error});
        message.error(error?.response?.data?.error);
        }
    //   setLoading(false);
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
    <MainLayout name="Create Batches">
        <Form onFinish={handleSubmit}>
            <div className={styles.inputFields}>
            <Input
                id="batchName"
                required
                size="large"
                value={values.batchName}
                onChange={handleChangeValues}
                placeholder="Batch Name"
                // variant="outlined"
            />
            <div className={styles.dateSelector}>
                <CustomDateRangePicker
                showTime={false}
                onChange={(props: any) => setValidity(props)}
                value={validity}
                />
            </div>
            <Form.Item >
                <Select
                  size="large"
                  onChange={(e) => {
                    setValues({ ...values, ["exams"]:e});
                    // console.log(values);
                  }}
                id="Exams"
                // onChange={handleChangeValues}
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
            <Form.Item >
                <Select
                  showSearch
                  id="Medium"
                  size="large"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={[
                    {
                      value: 'hindi',
                      label: 'Hindi',
                    },
                    {
                      value: 'english',
                      label: 'English',
                    },
                  ]}
                  onChange={(val: string) => {
                    console.log(val);
                    setValues({ ...values, ["medium"]:val});
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

            <Form.Item >
                <Select
                  size="large"
                  id="Classes"
                  onChange={(e) => {
                    setValues({ ...values, ["classes"]:e});
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

            
            <Form.Item >
                <Select
                  size="large"
                  onChange={(e) => {
                    console.log(values);
                    setValues({ ...values, ["roles"]:e});
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
            </div>
            <div className={styles.buttons}>
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
            >Submit</Button>
            </div>
        </Form>
        </MainLayout>
    );
};


export default CreateNewBatch;