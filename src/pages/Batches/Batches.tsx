import styles from "./Batches.module.scss";
import { useContext, useEffect, useState } from "react";
import { message, Popconfirm } from "antd";
import {
  Card,
  CreatableSelect,
  CustomTable,
  MUIChipsAutocomplete,
  Sidebar,
  StyledMUISelect,
} from "../../components";
import { Button } from "antd";
import { styled, Box } from "@mui/system";
import { IconButton, TextField } from "@mui/material";
import { AuthContext } from "../../utils/auth/AuthContext";
import { API_USERS } from "../../utils/api/config";
import MainLayout from "../../layouts/MainLayout";
import CustomDateRangePicker from "../../components/CustomDateRangePicker/CustomDateRangePicker";
import deleteIcon from "../../assets/icons/delete.svg";
import { PermissionsContext } from "../../utils/contexts/PermissionsContext";
import { TestContext } from "../../utils/contexts/TestContext";
import { capitalizeFirstLetter } from "../../utils";
import AddIcon from "@mui/icons-material/Add";
import dayjs from "dayjs";
import { NavLink } from "react-router-dom";
import CreateNewBatch from "./CreateBatches";
import EditIcon from "@mui/icons-material/Edit";

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

const Batches = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toggleSideBar, setToggleSideBar] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>();
  const [editMode, setEditMode] = useState(false);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchBatch() {
      setLoading(true);
      try {
        const res = await API_USERS().get(`/batch/get`);
        // console.log({ res });
        setData(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_BATCH", error);
        message.error("Error fetching batch");
      }
      setLoading(false);
    }

    if (currentUser?.id) {
      fetchBatch();
    }
  }, [currentUser]);

  const handleDeleteBatch = async (id: string) => {
    setLoading(true);
    try {
      const res = await API_USERS().delete(`/batch/delete`, {
        params: {
          id,
        },
      });
      if (res?.status === 200) {
        let batch: any = data.find((values: any) => values._id === id);
        message.success(`Batch ${batch?.name} deleted successfully`);
        setData((data) => data.filter((values: any) => values._id !== id));
      } else {
        message.error(res?.statusText);
      }
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "promoCode",
      render: (promoCode: any[]) => promoCode?.join(", "),
    },
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
      title: "Medium",
      dataIndex: "medium",
      render: (medium: string) => capitalizeFirstLetter(medium),
    },
    {
      title: "Members",
      dataIndex: "members",
      render: (members: any[]) => members?.length,
    },
    {
      title: "Classes",
      dataIndex: "classes",
      render: (classes: Array<string>) => classes && classes.join(","),
    },
    {
      title: "Roles",
      dataIndex: "roles",
      render: (roles: any[]) => roles?.join(", "),
    },
    {
      title: "Validity",
      dataIndex: "validity",
      render: (validity: any) =>
        `${new Date(validity?.from).toLocaleDateString()} to ${new Date(
          validity?.to
        ).toLocaleDateString()}`,
    },
    {
      title: "Edit",
      key: "edit",
      render: (_: any, record: any) => (
        <EditIcon
          style={{ cursor: "pointer" }}
          onClick={() => {
            setEditMode(true);
            console.log(record);
            setSelectedBatch(record);
            setToggleSideBar(true);
          }}
        />
      ),
    },
    {
      title: "Delete",
      key: "delete",
      render: (_: any, record: any) => (
        <Popconfirm
          title="Sure to delete this batch?"
          onConfirm={() => {
            handleDeleteBatch(record._id);
          }}
        >
          <IconButton>
            <img src={deleteIcon} alt="delete" />
          </IconButton>
        </Popconfirm>
      ),
    },
  ];

  return (
    <MainLayout
      name="Batches"
      menuActions={
        <Button
          type="primary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setToggleSideBar(true)}
          icon={<AddIcon />}
        >
          Create New
        </Button>
      }
    >
      <Card classes={[styles.container]}>
        <div className={styles.header}>
          <CreateNewBatch
            editMode={editMode}
            selectedBatch={selectedBatch}
            handleClose={() => {
              setToggleSideBar(false);
              setEditMode(false);
            }}
            toggleSideBar={toggleSideBar}
            setLoading={setLoading}
            setBatches={setData}
          />
        </div>
        <div className={styles.data}>
          <CustomTable
            scroll={{
              x: 1000,
            }}
            loading={loading}
            columns={columns}
            dataSource={data}
          />
        </div>
        {/* <Sidebar title="Recent Activity">Recent</Sidebar> */}
      </Card>
    </MainLayout>
  );
};

export default Batches;
