import styles from "./Batches.module.scss";
import { useContext, useEffect, useState } from "react";
import {
  DatePicker,
  message,
  Popconfirm,
  Select,
  SelectProps,
  Slider,
  Space,
  Table,
} from "antd";
import { useNavigate } from "react-router";
import {
  Button,
  Card,
  CreatableSelect,
  MUIChipsAutocomplete,
  Sidebar,
  StyledMUISelect,
} from "../../components";
import { styled, Box } from "@mui/system";
import { IconButton, TextField } from "@mui/material";
import clsx from "clsx";
import closeIcon from "../../assets/icons/close-circle.svg";
import axios from "axios";
import { AuthContext } from "../../utils/auth/AuthContext";
import { API_USERS } from "../../utils/api";
import MainLayout from "../../layouts/MainLayout";
import { AdapterDayjs } from "@mui/x-date-pickers-pro/AdapterDayjs";
import CustomDateRangePicker from "../../components/CusotmDateRangePicker/CustomDateaRangePicker";
import moment from "moment";
import { SliderMarks } from "antd/lib/slider";
import { DeleteOutline } from "@mui/icons-material";
import deleteIcon from "../../assets/icons/delete.svg";
import { PermissionsContext } from "../../utils/contexts/PermissionsContext";
import { TestContext } from "../../utils/contexts/TestContext";
interface DataType {
  key: React.Key;
  id: string;
  name: string;
  exam: string;
  createdAt: string;
  status: string;
}

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

const rowSelection = {
  onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
    console.log(
      `selectedRowKeys: ${selectedRowKeys}`,
      "selectedRows: ",
      selectedRows
    );
  },
  getCheckboxProps: (record: DataType) => ({
    disabled: record.name === "Disabled User", // Column configuration not to be checked
    name: record.name,
  }),
};

const Batches = () => {
  const [data, setData] = useState([]);

  const [toggleSideBar, setToggleSideBar] = useState(false);
  const navigate = useNavigate();

  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchBatch() {
      const res = await API_USERS().get(`/batch/get`);
      // console.log({ res });
      setData(res?.data);
      console.log("here", res.data);
    }

    if (currentUser?.id) {
      fetchBatch();
    }
  }, [currentUser]);
  const handleDeleteBatch = async (id: string) => {
    try {
      const res = await API_USERS().delete(`/batch/delete`, {
        params: {
          id,
        },
      });
      if (res?.status === 200) {
        message.success(res?.data?.message);
        setData((data) => data.filter((values: any) => values._id !== id));
      } else {
        message.error(res?.statusText);
      }
      console.log(res);
    } catch (err) {
      console.log(err);
    }
  };
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Exam(s)",
      dataIndex: "exams",
      render: (exams: any[]) => exams?.join(", "),
    },
    {
      title: "Members",
      dataIndex: "members",
      render: (members: any[]) => members?.length,
    },
    {
      title: "Validity",
      dataIndex: "validity",
      render: (validity: any) =>
        `${new Date(validity.from).toLocaleDateString()} to ${new Date(
          validity.to
        ).toLocaleDateString()}`,
    },
    {
      title: "Classes",
      dataIndex: "classes",
      render: (classes: Array<string>) => classes && classes.join(","),
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: any) => (
        <Space size="middle">
          <IconButton>
            <Popconfirm
              title="Sure to delete this batch?"
              onConfirm={() => {
                handleDeleteBatch(record._id);
              }}
            >
              <img src={deleteIcon} alt="delete" />
            </Popconfirm>
          </IconButton>
        </Space>
      ),
    },
  ];

  return (
    <MainLayout name="Batches">
      <Card classes={[styles.container]}>
        <div className={styles.header}>
          <Button onClick={() => setToggleSideBar(true)}>Create New</Button>

          <CreateNewBatch
            handleClose={() => setToggleSideBar(false)}
            toggleSideBar={toggleSideBar}
          />
        </div>
        <div className={styles.data}>
          <Table
            rowSelection={{
              type: "checkbox",
              ...rowSelection,
            }}
            columns={columns}
            dataSource={data}
          />
        </div>
        {/* <Sidebar title="Recent Activity">Recent</Sidebar> */}
      </Card>
    </MainLayout>
  );
};

interface CreateNewBatchProps {
  handleClose: () => void;
  toggleSideBar: boolean;
}
const CreateNewBatch: React.FC<CreateNewBatchProps> = ({
  handleClose,
  toggleSideBar,
}) => {
  const [batch, setBatch] = useState();
  const [validity, setValidity] = useState([]);
  const [classes, setClasses] = useState<any>([]);
  const [roleOptions, setRoleOptions] = useState<any>([]);
  const [roles, setRoles] = useState<any>([]);
  const [values, setValues] = useState({} as any);

  const { currentUser } = useContext(AuthContext);
  const { allRoles } = useContext(PermissionsContext);
  const { exams: examOptions } = useContext(TestContext);

  useEffect(() => {
    if (allRoles) {
      console.log({ allRoles });
      const options = allRoles.map((value: any) => ({
        value: value.id,
        name: value.name,
      }));
      setRoleOptions(options);
    }
  }, [allRoles]);

  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // handleReset();
    e.preventDefault();
    try {
      const finalData = {
        name: values.batchName,
        exams: values.exams?.map((exam: any) => exam.name),
        medium: values.medium,
        institute: currentUser?.instituteId,
        validity: {
          from: moment(validity[0]).toISOString(),
          to: moment(validity[1]).toISOString(),
        },
        classes: classes.map((value: any) => value.name),
        createdBy: {
          userType: currentUser?.userType,
          id: currentUser?.id,
        },
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        members: [],
        roles: roles.map((value: any) => value.value),
      };
      const res = await API_USERS().post(`/batch/create`, finalData);
      message.success(res?.data?.message);
    } catch (error: any) {
      console.log("ERROR_CREATE_BATCH", error);
      message.error(error?.response?.data?.message);
    }
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
    <Sidebar
      title="Create New Batch"
      open={toggleSideBar}
      width="350px"
      handleClose={handleClose}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="batchName"
            required
            value={values.batchName}
            onChange={handleChangeValues}
            label="Batch Name"
            variant="outlined"
          />
          <div className={styles.dateSelector}>
            <CustomDateRangePicker
              showTime={false}
              onChange={(props: any) => setValidity(props)}
              value={validity}
            />
          </div>
          <CreatableSelect
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
          />
          <StyledMUISelect
            options={[
              { name: "Hindi", value: "hindi" },
              { name: "English", value: "english" },
            ]}
            value={values.medium}
            label="Medium"
            // @ts-ignore
            onChange={(val: string) => {
              setValues({ ...values, medium: val });
            }}
          />
          <CreatableSelect
            multiple
            options={options}
            setValue={setClasses}
            value={classes}
            label={"Classes"}
            id="Classes"
            onAddModalSubmit={function (value: any): void {}}
          />
          <MUIChipsAutocomplete
            label="Role(s)"
            value={roles}
            options={roleOptions || []}
            onChange={setRoles}
            error={false}
            helperText=""
          />
        </div>
        <div className={styles.buttons}>
          <Button>Submit</Button>
        </div>
      </form>
    </Sidebar>
  );
};

export default Batches;
