import { useCallback, useContext, useEffect, useState } from "react";
import { Tab, Tabs } from "@mui/material";
import styles from "./Test.module.scss";
import { Button, CustomTable, Modal, Sidebar } from "../../components";
import { TestContext } from "../../utils/contexts/TestContext";
import { Table } from "antd";
import "antd/dist/antd.css";
import { useNavigate } from "react-router";
import MainLayout from "../../layouts/MainLayout";
import { Add as AddIcon } from "@mui/icons-material";

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
      dataIndex: "_id",
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
          onClick={() => {
            console.log({ row });
            navigate(`/test/result/${row.name}/${row.exam.name}/${row._id}`);
          }}
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
    console.log(newValue);
    switch (newValue) {
      case 0:
        setData([]);
        setLoading(true);
        fetchTest("ongoing", (error, result: any[]) => {
          if (error) console.log(error);
          setLoading(false);
          setData(
            result?.map((test: any) => ({
              ...test,
              key: test.id,
              id: test.id,
              name: test.name,
              createdAt: test.createdAt,
              status: test.status,
              exam: test.exam,
            }))
          );
        });
        break;
      case 1:
        setData([]);
        setLoading(true);
        fetchTest("active", (error, result: any[]) => {
          if (error) console.log(error);
          setLoading(false);
          setData(
            result?.map((test: any) => ({
              ...test,
              key: test.id,
              id: test.id,
              name: test.name,
              createdAt: test.createdAt,
              status: test.status,
              exam: test.exam,
            }))
          );
        });
        break;
      case 2:
        setData([]);
        setLoading(true);
        fetchTest("inactive", (error, result: any[]) => {
          if (error) console.log(error);
          setLoading(false);
          setData(
            result?.map((test: any) => ({
              ...test,
              key: test.id,
              id: test.id,
              name: test.name,
              createdAt: test.createdAt,
              status: test.status,
              exam: test.exam,
            }))
          );
        });
        break;
      case 3:
        setData([]);
        setLoading(true);
        fetchTest("expired", (error, result: any[]) => {
          if (error) console.log(error);
          setLoading(false);
          setData(
            result?.map((test: any) => ({
              ...test,
              key: test.id,
              id: test.id,
              name: test.name,
              createdAt: test.createdAt,
              status: test.status,
              exam: test.exam,
            }))
          );
        });
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    setLoading(true);
    if (fetchTest)
      fetchTest("ongoing", (error, result) => {
        setData(
          result?.map((test: any) => ({
            ...test,
            key: test.id,
            id: test.id,
            name: test.name,
            createdAt: test.createdAt,
            status: test.status,
            exam: test.exam,
          }))
        );
        setLoading(false);
      });
  }, []);

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
          <Button onClick={() => navigate("/test/new")} icon={<AddIcon />}>
            Add New
          </Button>
        </div>
        <TabPanel value={tab} index={0}>
          <div className={styles.data}>
            <CustomTable
              loading={loading}
              selectable={false}
              columns={columns}
              dataSource={data}
              scroll={{ x: 600, y: 500 }}
            />
          </div>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <div className={styles.data}>
            <CustomTable
              loading={loading}
              selectable={false}
              columns={columns}
              dataSource={data}
              scroll={{ x: 600, y: 500 }}
            />
          </div>
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <div className={styles.data}>
            <CustomTable
              loading={loading}
              selectable={false}
              columns={columns}
              dataSource={data}
              scroll={{ x: 600, y: 500 }}
            />
          </div>
        </TabPanel>
        <TabPanel value={tab} index={3}>
          <div className={styles.data}>
            <CustomTable
              loading={loading}
              selectable={false}
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
