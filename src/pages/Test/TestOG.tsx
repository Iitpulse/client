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
import { API_TESTS } from "../../utils/api/config";
import { AUTH_TOKEN } from "../../utils/constants";
import { ITest } from "../../utils/interfaces";
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
  const [isGiven, setIsGiven] = useState<boolean>(false);

  const userCtx = useContext(AuthContext);
  console.log(userCtx);
  // async function verifyTestSubmission(row: any) {
  //   console.log({ row });
  //   setLoading(true);
  //   let studentId = row._id,
  //     testId = row.exam.id;
  //   let sid = studentId;
  //   if (!studentId) sid = currentUser?.id;
  //   try {
  //     const res = await API_TESTS().get(`/test/result/student`, {
  //       params: {
  //         testId,
  //         studentId: sid,
  //       },
  //     });
  //     // console.log("student result", res.data);
  //     // console.log({ data: res.data });
  //     setIsGiven(true);
  //   } catch (error: any) {
  //     // message.error(error?.response?.data?.message);
  //     setIsGiven(false);
  //   }
  //   setLoading(false);
  // }
  function handleClickTest(id: string) {
    let a = document.createElement("a");
    let token = localStorage.getItem(AUTH_TOKEN);
    const testLink = import.meta.env.VITE_TEST_PORTAL_URI;
    a.href = `${testLink}/auth/${token}/${id}`;
    a.target = "_blank";
    a.click();
  }
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
      title: "Duration(in Mins)",
      dataIndex: "durationInMinutes",
    },
    {
      title: "Status",
      dataIndex: "status",
    },
    {
      title: "Actions",
      fixed: "right",
      render: (row: any, test: ITest) => (
        <>
          {row?.result?.students?.find(
            (user: any) => user._id === userCtx?.currentUser?.id
          ) ? (
            row.result.publishProps.type === "immediately" ||
            row.result.publishProps.isPublished ? (
              <Button
                onClick={() => {
                  console.log({ row });
                  navigate(
                    `/test/result/${row.name}/${row.exam.name}/${row._id}`
                  );
                }}
              >
                View Result
              </Button>
            ) : (
              <p>Result not published yet</p>
            )
          ) : (
            <Button onClick={handleClickTest.bind(null, test?.id)}>
              Attempt Test
            </Button>
          )}
        </>
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
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const navigate = useNavigate();

  const [data, setData] = useState<any>([]);

  const { state, fetchTest } = useContext(TestContext);
  // console.log(userCtx);
  const roles = userCtx?.roles;
  let permissions: any = [];
  Object.values(roles).map(
    (role: any) => (permissions = [...permissions, ...role.permissions])
  );
  // console.log(permissions);
  const { ongoingTests } = state;
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
    fetchTest("active", false, (error, result) => {
      setData(
        result
          ?.filter((t) => {
            return getStatus(t.validity) === "Ongoing";
          })
          ?.map((test: any) => ({
            ...test,
            key: test._id,
            id: test._id,
            name: test.name,
            createdAt: test.createdAt,
            status: "Ongoing",
            exam: test.exam,
          }))
      );
      setLoading(false);
    });
  }, []);

  return (
    <MainLayout name="Ongoing Test">
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
