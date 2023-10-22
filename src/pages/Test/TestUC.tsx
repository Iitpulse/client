import { useCallback, useContext, useEffect, useState } from "react";
import { Tab, Tabs } from "@mui/material";
import styles from "./Test.module.scss";
import { Button, CustomTable, Modal, Sidebar } from "../../components";
import { TestContext } from "../../utils/contexts/TestContext";
import { Table } from "antd";
import { Error } from "../";
import { useNavigate } from "react-router";
import MainLayout from "../../layouts/MainLayout";
import { Add as AddIcon } from "@mui/icons-material";
import { AuthContext } from "./../../utils/auth/AuthContext";
import dayjs from "dayjs";

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
      title: "Duration(in minutes)",
      dataIndex: "durationInMinutes",
    },
    {
      title: "Start Time",
      render: (row: any) => new Date(row.validity.from).toLocaleString(),
    },
    {
      title: "End Time",
      render: (row: any) => new Date(row.validity.to).toLocaleString(),
    },

    {
      title: "Status",
      dataIndex: "status",
    },
    // {
    //   title: "Actions",
    //   fixed: "right",
    //   render: (row: any) => (
    //     <Button
    //       onClick={() => {
    //         console.log({ row });
    //         navigate(`/test/result/${row.name}/${row.exam.name}/${row._id}`);
    //       }}
    //     >
    //       View Result
    //     </Button>
    //   ),
    // },
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
  const userCtx = useContext(AuthContext);
  // console.log(userCtx);
  const roles = userCtx?.roles;
  let permissions: any = [];
  Object.values(roles).map(
    (role: any) => (permissions = [...permissions, ...role.permissions])
  );
  // console.log(permissions);
  const { ongoingTests, activeTests, inactiveTests, expiredTests } = state;
  const { currentUser } = useContext(AuthContext);
  function getStatus(validity: any) {
    const testDateRange = [dayjs(validity.from), dayjs(validity.to)];
    if (testDateRange[0] && testDateRange[1]) {
      if (dayjs().isBefore(testDateRange[0])) {
        return "Upcoming";
      }
      if (dayjs().isAfter(testDateRange[1])) {
        return "Expired";
      }
      return "Ongoing";
    }
    return "Active";
  }
  useEffect(() => {
    setLoading(true);
    if (fetchTest)
      fetchTest("active", false, (error, result) => {
        setData(
          result
            ?.filter((t) => {
              return getStatus(t.validity) === "Upcoming";
            })
            ?.map((test: any) => ({
              ...test,
              key: test.id,
              id: test.id,
              name: test.name,
              createdAt: test.createdAt,
              status: "Upcoming",
              exam: test.exam,
            }))
        );
        setLoading(false);
      });
  }, []);
  console.log({ data });
  return (
    <MainLayout name="Upcoming Test">
      <div className={styles.container}>
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
