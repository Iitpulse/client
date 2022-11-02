import { useCallback, useContext, useEffect, useState } from "react";
import { Tab, Tabs } from "@mui/material";
import styles from "./Test.module.scss";
import { Button, Modal, Sidebar } from "../../components";
import { TestContext } from "../../utils/contexts/TestContext";
import { Table } from "antd";
import "antd/dist/antd.css";
import { useNavigate } from "react-router";
import MainLayout from "../../layouts/MainLayout";

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
  const columns: any = [
    {
      title: "ID",
      dataIndex: "id",
      width: 100,
      render: (text: string) => (
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
            display: "inline-block",
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Exam",
      dataIndex: "exam",
      render: (exam: any) => exam.name,
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
    {
      title: "Actions",
      fixed: "right",
      render: (row: any) => (
        <Button
          onClick={() =>
            navigate(`/test/result/${row.name}/${row.exam.name}/${row.id}`)
          }
        >
          View Result
        </Button>
      ),
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

  // Transfered above code from above the component to its inside to use navigate funtion inside colums array

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  const navigate = useNavigate();

  const [data, setData] = useState<any>([]);

  const { state, fetchTest } = useContext(TestContext);
  const { ongoingTests, activeTests, inactiveTests, expiredTests } = state;

  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
    switch (newValue) {
      case 0:
        setData([]);
        setLoading(true);
        fetchTest("ongoing");
        break;
      case 1:
        setData([]);
        setLoading(true);
        fetchTest("active");
        break;
      case 2:
        setData([]);
        setLoading(true);
        fetchTest("inactive");
        break;
      case 3:
        setData([]);
        setLoading(true);
        fetchTest("expired");
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    if (fetchTest) fetchTest("ongoing");
  }, []);

  useEffect(() => {
    if (ongoingTests?.length) {
      setData(
        ongoingTests.map((test) => ({
          ...test,
          key: test.id,
          id: test.id,
          name: test.name,
          createdAt: test.createdAt,
          status: test.status,
          exam: test.exam,
        }))
      );
    }
    setLoading(false);
  }, [ongoingTests]);

  useEffect(() => {
    setData([]);
    if (inactiveTests?.length) {
      setData(
        inactiveTests.map((test) => ({
          ...test,
          key: test.id,
          id: test.id,
          name: test.name,
          createdAt: test.createdAt,
          status: test.status,
          exam: test.exam,
        }))
      );
    }
    setLoading(false);
  }, [inactiveTests]);

  useEffect(() => {
    if (inactiveTests?.length) {
      setData(() =>
        inactiveTests.map((test) => ({
          ...test,
          key: test.id,
          id: test.id,
          name: test.name,
          createdAt: test.createdAt,
          status: test.status,
          exam: test.exam,
        }))
      );
    }
    setLoading(false);
  }, [inactiveTests]);

  useEffect(() => {
    if (inactiveTests?.length) {
      setData(
        inactiveTests.map((test) => ({
          ...test,
          key: test.id,
          id: test.id,
          name: test.name,
          createdAt: test.createdAt,
          status: test.status,
          exam: test.exam,
        }))
      );
    }
    setLoading(false);
  }, [inactiveTests]);

  useEffect(() => {
    if (expiredTests?.length) {
      setData(
        expiredTests.map((test) => ({
          ...test,
          key: test.id,
          id: test.id,
          name: test.name,
          createdAt: test.createdAt,
          status: test.status,
          exam: test.exam,
        }))
      );
    }
    setLoading(false);
  }, [expiredTests]);

  return (
    <MainLayout name="Test">
      <div className={styles.container}>
        <div className={styles.header}>
          <Tabs value={tab} onChange={handleChangeTab}>
            <Tab label="Ongoing" />
            <Tab label="Active" />
            <Tab label="Inactive" />
            <Tab label="Expired" />
          </Tabs>
          <Button onClick={() => navigate("/test/new")}>Add New</Button>
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
              scroll={{ x: 600, y: 500 }}
            />
          </div>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <div className={styles.data}>
            <Table
              rowSelection={{
                type: "checkbox",
                ...rowSelection,
              }}
              columns={columns}
              dataSource={data}
              scroll={{ x: 600, y: 500 }}
            />
          </div>
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <div className={styles.data}>
            <Table
              rowSelection={{
                type: "checkbox",
                ...rowSelection,
              }}
              columns={columns}
              dataSource={data}
              scroll={{ x: 600, y: 500 }}
            />
          </div>
        </TabPanel>
        <TabPanel value={tab} index={3}>
          <div className={styles.data}>
            <Table
              rowSelection={{
                type: "checkbox",
                ...rowSelection,
              }}
              columns={columns}
              dataSource={data}
              scroll={{ x: 600, y: 500 }}
            />
          </div>
        </TabPanel>
        {/* <Sidebar title="Recent Activity">Recent</Sidebar> */}
        <Modal
          isOpen={openModal}
          onClose={() => setOpenModal(false)}
          title="CreateTest"
          backdrop
        >
          Content
        </Modal>
      </div>
    </MainLayout>
  );
};

export default Test;
