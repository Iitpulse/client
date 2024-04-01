import { useCallback, useContext, useEffect, useState } from "react";
import { IconButton, Link as MLink, Tab, Tabs } from "@mui/material";
import styles from "./Test.module.scss";
import { Button } from "antd";
import { CustomTable, Modal, Sidebar } from "../../components";
import { TestContext, useTestContext } from "../../utils/contexts/TestContext";
import { Error } from "../";
import { useNavigate } from "react-router";
import MainLayout from "../../layouts/MainLayout";
import { Add as AddIcon, DeleteForever } from "@mui/icons-material";
import { AuthContext } from "./../../utils/auth/AuthContext";
import { Tag, message } from "antd";
import { Link } from "react-router-dom";
import CustomPopConfirm from "../../components/PopConfirm/CustomPopConfirm";
import { API_TESTS } from "../../utils/api/config";
import dayjs from "dayjs";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface DataType {
  key: React.Key;
  id: string;
  name: string;
  exam: string;
  createdAt: string;
  status: string;
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
  function getColorByStatus(status: string) {
    return status === "Ongoing"
      ? "green"
      : status === "Active"
      ? "yellow"
      : "red";
  }

  async function handleDeleteTest(testId: string) {
    console.log(testId);
    try {
      message.loading("Deleting Test", 1);
      const res = await API_TESTS().delete("test/delete/" + testId);
      setData(data.filter((test: any) => test._id !== testId));
      message.destroy(1);
      message.success("Deleted Successfully");
    } catch (error) {
      message.destroy(1);
      message.error("Some Error Occured");
    }
  }

  const { exams } = useContext(TestContext);

  const [columns, setColumns] = useState<any>([
    {
      title: "ID",
      dataIndex: "_id",
      width: 100,
      fixed: "left",
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
      width: 150,
      searchable: true,
      fixed: "left",
      render: (name: string, row: any) => (
        <Link to={`/test/edit/${row._id}`}>
          <MLink className={styles.ellipsis}>{name}</MLink>
        </Link>
      ),
    },
    {
      title: "Exam",
      dataIndex: "exam",
      width: 150,
      filters: exams?.map((exam: any) => ({
        text: exam.name,
        value: exam.name,
      })),
      onFilter: (value: any, record: any) =>
        record.exam.name.indexOf(value) == 0,
      render: (exam: any) => (
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
            display: "inline-block",
          }}
        >
          {exam.name}
        </span>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      width: 200,
      render: (date: string) => new Date(date).toDateString(),
      sorter: (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Duration(min)",
      dataIndex: "durationInMinutes",
      width: 160,
      defaultSortOrder: "descend",
      sorter: (a: any, b: any) => a.durationInMinutes - b.durationInMinutes,
    },
    {
      title: "Start Time",
      width: 150,
      render: (row: any) => new Date(row.validity.from).toLocaleString(),
      defaultSortOrder: "descend",
      sorter: (a: any, b: any) =>
        new Date(a.validity.from).getTime() -
        new Date(b.validity.from).getTime(),
    },
    {
      title: "End Time",
      width: 150,
      render: (row: any) => new Date(row.validity.to).toLocaleString(),
      defaultSortOrder: "descend",
      sorter: (a: any, b: any) =>
        new Date(a.validity.to).getTime() - new Date(b.validity.to).getTime(),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={getColorByStatus(status)}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      fixed: "right",
      width: 150,
      render: (row: any) => {
        // console.log({ row });
        if (
          (row?.result?.publishProps?.type === "immediately" ||
            row?.result?.publishProps?.isPublished) &&
          row?.status !== "Active"
        ) {
          return (
            <div className={styles.flexRow}>
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
              <CustomPopConfirm
                title="Are you sure to delete Test?"
                onConfirm={() => {
                  handleDeleteTest(row._id);
                }}
                cancelText="Cancel"
                okText="Yes, Delete"
              >
                <IconButton>
                  <DeleteForever />
                </IconButton>
              </CustomPopConfirm>
            </div>
          );
        } else {
          return (
            <div className={styles.flexRow}>
              <p>No Result</p>
              <CustomPopConfirm
                title="Are you sure to delete Test?"
                onConfirm={() => {
                  handleDeleteTest(row._id);
                }}
                cancelText="Cancel"
                okText="Yes, Delete"
              >
                <IconButton>
                  <DeleteForever />
                </IconButton>
              </CustomPopConfirm>
            </div>
          );
        }
      },
    },
  ]);

  // Transfered above code from above the component to its inside to use navigate funtion inside colums array

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  const navigate = useNavigate();

  const [data, setData] = useState<any>([]);

  const { state, fetchTest } = useTestContext();
  const userCtx = useContext(AuthContext);
  // console.log(userCtx);
  const roles = userCtx?.roles;
  let permissions: any = [];
  Object.values(roles).map(
    (role: any) => (permissions = [...permissions, ...role.permissions])
  );
  // console.log(permissions);
  const { ongoingTests, activeTests, inactiveTests, expiredTests } = state;
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
  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
    console.log(newValue);
    switch (newValue) {
      case 0:
        setData([]);
        setLoading(true);
        fetchTest("active", false, (error, result: any[]) => {
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
        fetchTest("inactive", false, (error, result: any[]) => {
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
        fetchTest("active", false, (error, result: any[]) => {
          if (error) console.log(error);
          //ongoing
          setLoading(false);
          console.log(
            result,
            result?.filter((t) => {
              console.log(t.validity, getStatus(t.validity));
              return getStatus(t.validity) === "Ongoing";
            })
          );
          setData(
            result
              ?.filter((t) => {
                return getStatus(t.validity) === "Ongoing";
              })
              ?.map((test: any) => ({
                ...test,
                key: test.id,
                id: test.id,
                name: test.name,
                createdAt: test.createdAt,
                status: "Ongoing",
                exam: test.exam,
              }))
          );
        });
        break;

      case 3:
        setData([]);
        setLoading(true);
        fetchTest("active", false, (error, result: any[]) => {
          if (error) console.log(error);
          //upcomg
          setLoading(false);
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
        });
        break;
      case 4:
        setData([]);
        setLoading(true);
        fetchTest("active", false, (error, result: any[]) => {
          if (error) console.log(error);
          console.log(
            result,
            result?.filter((t) => {
              console.log(t.validity, getStatus(t.validity));
              return getStatus(t.validity) === "Expired";
            })
          );
          //expired
          setLoading(false);
          setData(
            result
              ?.filter((t) => {
                return getStatus(t.validity) === "Expired";
              })
              ?.map((test: any) => ({
                ...test,
                key: test.id,
                id: test.id,
                name: test.name,
                createdAt: test.createdAt,
                status: "Expired",
                exam: test.exam,
              }))
          );
        });
        break;

      default:
        break;
    }
  }
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    setLoading(true);
    if (fetchTest)
      fetchTest("active", false, (error, result) => {
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
    <MainLayout
      name="Test"
      menuActions={
        permissions.find((value: string) => value === "CREATE_TEST") && (
          <Button
            type="primary"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => navigate("/test/new")}
            icon={<AddIcon />}
          >
            Add New
          </Button>
        )
      }
    >
      {currentUser?.userType != "student" ? (
        <div className={styles.container}>
          <div className={styles.header}>
            <Tabs value={tab} onChange={handleChangeTab}>
              <Tab label="Active" />
              <Tab label="Inactive" />
              <Tab label="Ongoing" />
              <Tab label="Upcoming" />
              <Tab label="Expired" />
            </Tabs>
          </div>
          {[...Array(5)].map((_, index) => (
            <TabPanel value={tab} index={index}>
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
          ))}

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
      ) : (
        <Error />
      )}
    </MainLayout>
  );
};

export default Test;
