import styles from "./Batches.module.scss";
import { useState } from "react";
import { Table } from "antd";
import { useNavigate } from "react-router";
import { Button, Sidebar } from "../../components";
import { styled, Box } from "@mui/system";
import { TextField } from "@mui/material";
import clsx from "clsx";
import closeIcon from "../../assets/icons/close-circle.svg";
import { DateRangePicker, LocalizationProvider } from "@mui/lab";
import AdapterDateFns from "@mui/lab/AdapterDateFns";
import { stringify } from "querystring";

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
      backgroundColor: " #f3f3f9",
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

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      // render: (text: string) => <a>{text}</a>,
    },
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Exam",
      dataIndex: "exam",
      render: (exam: any) => exam.fullName,
    },
    {
      title: "Members",
      dataIndex: "members",
      render: (members: any[]) => members.length,
    },
  ];

  return (
    <div className={styles.container}>
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
      <Sidebar title="Recent Activity">Recent</Sidebar>
    </div>
  );
};

interface CreateNewBatchProps {
  handleClose: () => void;
}
const CreateNewBatch: React.FC<CreateNewBatchProps> = ({ handleClose }) => {
  const [batch, setBatch] = useState();
  const [validity, setValidity] = useState({ from: 0, to: 0 });
  const [values, setValues] = useState({} as any);
  function handleChangeValidity(newValue: any) {
    setValidity({ from: newValue[0], to: newValue[1] });
  }
  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // handleReset();
  }
  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div className={styles.flexRow}>
            <h2>Add a Student</h2>
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
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateRangePicker
                startText="Valid From"
                endText="Valid Till"
                value={[validity.from, validity.to]}
                onChange={handleChangeValidity}
                renderInput={(startProps: any, endProps: any) => (
                  <>
                    <TextField {...startProps} />
                    <Box sx={{ mx: 2 }}> to </Box>
                    <TextField {...endProps} />
                  </>
                )}
              />
            </LocalizationProvider>
          </div>
        </div>
        <div className={styles.buttons}>
          <Button>Submit</Button>
        </div>
      </form>
    </div>
  );
};

export default Batches;
