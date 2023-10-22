import { useContext, useState } from "react";
import { IconButton, Link as MLink, Tab, Tabs } from "@mui/material";
import styles from "./Test.module.scss";
import { Button } from "antd";
import { CustomTable, Modal } from "../../components";
import { useTestContext } from "../../utils/contexts/TestContext";
import { Error } from "../";
import { useNavigate } from "react-router";
import MainLayout from "../../layouts/MainLayout";
import { Add as AddIcon, DeleteForever } from "@mui/icons-material";
import { AuthContext } from "./../../utils/auth/AuthContext";
import { Tag, message } from "antd";
import { Link } from "react-router-dom";
import CustomPopConfirm from "../../components/PopConfirm/CustomPopConfirm";
import { API_TESTS } from "../../utils/api/config";
import { TabPanel } from "../Questions/Common";
// import { TabPanel } from "./Test";

export const Test = () => {
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
      message.destroy(1);
      message.success("Deleted Successfully");
    } catch (error) {
      message.destroy(1);
      message.error("Some Error Occured");
    }
  }

  const [columns, setColumns] = useState<any>([
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
      with: 200,
      searchable: true,
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
      render: (exam: any) => exam.name,
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
      title: "Duration(in minutes)",
      dataIndex: "durationInMinutes",
      width: 200,
      defaultSortOrder: "descend",
      sorter: (a: any, b: any) => a.durationInMinutes - b.durationInMinutes,
    },
    {
      title: "Start Time",
      render: (row: any) => new Date(row.validity.from).toLocaleString(),
      defaultSortOrder: "descend",
      sorter: (a: any, b: any) =>
        new Date(a.validity.from).getTime() -
        new Date(b.validity.from).getTime(),
    },
    {
      title: "End Time",
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
      render: (row: any) => {
        console.log({ row });
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
              <p>Result Not Published yet</p>
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
      // case 1:
      //   setData([]);
      //   setLoading(true);
      //   fetchTest("active", false, (error, result: any[]) => {
      //     if (error) console.log(error);
      //     setLoading(false);
      //     setData(
      //       result?.map((test: any) => ({
      //         ...test,
      //         key: test.id,
      //         id: test.id,
      //         name: test.name,
      //         createdAt: test.createdAt,
      //         status: test.status,
      //         exam: test.exam,
      //       }))
      //     );
      //   });
      //   break;
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
        fetchTest("expired", false, (error, result: any[]) => {
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
  const { currentUser } = useContext(AuthContext);

  // useEffect(() => {
  //   setLoading(true);
  //   if (fetchTest)
  //     fetchTest("ongoing", false, (error, result) => {
  //       setData(
  //         result?.map((test: any) => ({
  //           ...test,
  //           key: test.id,
  //           id: test.id,
  //           name: test.name,
  //           createdAt: test.createdAt,
  //           status: test.status,
  //           exam: test.exam,
  //         }))
  //       );
  //       setLoading(false);
  //     });
  // }, []);
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
          <TabPanel value={tab} index={4}>
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
      ) : (
        <Error />
      )}
    </MainLayout>
  );
};
