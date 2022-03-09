import { useContext, useEffect, useState } from "react";
import { Tab, Tabs } from "@mui/material";
import styles from "./Test.module.scss";
import { Button, Modal, Sidebar } from "../../components";
import { TestContext } from "../../utils/contexts/TestContext";
import { Table } from "antd";
import "antd/dist/antd.css";

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
    title: "Created",
    dataIndex: "createdAt",
    render: (date: string) => new Date(date).toLocaleString(),
  },
  {
    title: "Status",
    dataIndex: "status",
  },
];

interface DataType {
  key: React.Key;
  id: string;
  name: string;
  exam: string;
  createdAt: string;
  status: string;
}

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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const Test = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  const [data, setData] = useState<any>([]);

  const { state } = useContext(TestContext);
  const { tests } = state;

  useEffect(() => {
    if (tests?.length) {
      setData(
        tests.map((test) => ({
          key: test.id,
          id: test.id,
          name: test.name,
          createdAt: test.createdAt,
          status: test.status,
          exam: test.exam,
        }))
      );
      setLoading(false);
    }
  }, [tests]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Tabs value={tab} onChange={handleChangeTab}>
          <Tab label="Ongoing" />
          <Tab label="Active" />
          <Tab label="Inactive" />
          <Tab label="Expired" />
        </Tabs>
        <Button onClick={() => setOpenModal(true)}>Add New</Button>
      </div>
      <TabPanel value={tab} index={0}>
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
      </TabPanel>
      <Sidebar title="Recent Activity">Recent</Sidebar>
      <Modal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title="CreateTest"
        backdrop
      >
        Content
      </Modal>
    </div>
  );
};

export default Test;
