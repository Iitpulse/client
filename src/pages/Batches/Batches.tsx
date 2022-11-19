import styles from "./Batches.module.scss";
import { useContext, useEffect, useState } from "react";
import { DatePicker, Slider, Table } from "antd";
import { useNavigate } from "react-router";
import { Button, Card, Sidebar } from "../../components";
import { styled, Box } from "@mui/system";
import { TextField } from "@mui/material";
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

  const [isModalRequested, setIsModalRequested] = useState(false);
  const navigate = useNavigate();

  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchBatch() {
      const res = await API_USERS().get(`/batch/get`);
      // console.log({ res });
      setData(res?.data);
    }

    if (currentUser?.id) {
      fetchBatch();
    }
  }, [currentUser]);

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Exam",
      dataIndex: "exam",
    },
    {
      title: "Members",
      dataIndex: "members",
      render: (members: any[]) => members.length,
    },
  ];

  return (
    <MainLayout name="Batches">
      <Card classes={[styles.container]}>
        <div className={styles.header}>
          <Button onClick={() => setIsModalRequested(true)}>Create New</Button>
          {isModalRequested && (
            <CreateNewBatch handleClose={() => setIsModalRequested(false)} />
          )}
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
}
const CreateNewBatch: React.FC<CreateNewBatchProps> = ({ handleClose }) => {
  const [batch, setBatch] = useState();
  const [validity, setValidity] = useState([]);
  const [classesFrom, setClassesFrom] = useState(10);
  const [classesTo, setClassesTo] = useState(12);
  const [values, setValues] = useState({} as any);
  function handleChangeValidity(newValue: any) {
    setValidity(newValue);
  }

  const { currentUser } = useContext(AuthContext);

  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // handleReset();
    e.preventDefault();
    const finalData = {
      id: "IITP_" + Math.floor(Math.random() * 1000000),
      name: values.batchName,
      exam: "JEEMAINS",
      institute: "IITP",
      validity: {
        from: moment(validity[0]).toISOString(),
        to: moment(validity[1]).toISOString(),
      },
      classes: {
        from: classesFrom,
        to: classesTo,
      },
      createdBy: {
        userType: currentUser?.userType,
        id: currentUser?.id,
      },
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      members: [],
    };
    const res = await API_USERS().post(`/batch/create`, finalData);
    if (res.status === 200) {
      alert("Succesfully Created");
    }
    // console.log({ res });
  }
  const marks: SliderMarks = {
    0: "0",
    1: "1st",
    2: "2nd",
    3: "3rd",
    4: "4th",
    5: "5th",
    6: "6th",
    7: "7th",
    8: "8th",
    9: "9th",
    10: "10th",
    11: "11th",
    12: "12th",
    13: "dropper",
  };

  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div className={styles.flexRow}>
            <h2>Add a Batch</h2>
          </div>
          <img onClick={handleClose} src={closeIcon} alt="Close" />
        </div>
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
        </div>
        <div>
          <Slider
            range
            marks={marks}
            defaultValue={[10, 12]}
            max={13}
            min={1}
            value={[classesFrom, classesTo]}
            onChange={(e) => {
              setClassesFrom(e[0]);
              setClassesTo(e[1]);
            }}
          />
        </div>
        <div className={styles.buttons}>
          <Button>Submit</Button>
        </div>
      </form>
    </div>
  );
};

export default Batches;
