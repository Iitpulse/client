import styles from "./Institutes.module.scss";
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
import { API_TESTS, API_USERS } from "../../utils/api/config";
import deleteIcon from "../../assets/icons/delete.svg";

import AddIcon from "@mui/icons-material/Add";
import CreateNewInstitute from "./CreateInstitutes";
import { API_QUESTIONS } from "../../utils/api/config";
import EditIcon from "@mui/icons-material/Edit";
import dayjs from "dayjs";
import MainLayout from "../../layouts/MainLayout";

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

const Institutes = () => {
  const [toggleSideBar, setToggleSideBar] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState<any>();
  const [editMode, setEditMode] = useState(false);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchInstitutes() {
      setLoading(true);
      try {
        const res = await API_USERS().get(`/institute/get`);
        console.log({ res });
        setData(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_Institutes", error);
        message.error("Error fetching Institutes");
      }
      setLoading(false);
    }

    if (currentUser?.id) {
      fetchInstitutes();
    }
  }, [currentUser]);

  const handleDeleteInstitutes = async (id: string) => {
    setLoading(true);
    try {
      const res = await API_USERS().delete(`/institute/delete/`, {
        params: {
          _id: id,
        },
      });
      if (res?.status === 200) {
        message.success("Successfully deleted Institute");
        setData((data) => data.filter((values: any) => values._id !== id));
      } else {
        message.error("Something went wrong");
      }
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Modified At",
      dataIndex: "modifiedAt",
      render: (text: any, record: any) => {
        console.log({ text, record });
        return <p>{text}</p>;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      render: (text: any, record: any) => {
        console.log({ text, record });
        return <p>{text}</p>;
      },
    },
    {
      title: "Address",
      dataIndex: "address",
    },
    {
      title: "Person of Contact",
      children: [
        {
          title: "Name",
          render: (_: any, record: any) => <p>{record?.poc?.name}</p>,
        },
        {
          title: "Email",
          render: (text: any, record: any) => <p>{record?.poc?.email}</p>,
        },
        {
          title: "Phone",
          render: (text: any, record: any) => <p>{record?.poc?.phone}</p>,
        },
      ],
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
            setSelectedInstitute(record);
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
          title="Sure to delete this Institute?"
          onConfirm={() => {
            console.log(record);
            handleDeleteInstitutes(record?._id);
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
      name="Institutes"
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
          <CreateNewInstitute
            editMode={editMode}
            selectedInstitute={selectedInstitute}
            title={editMode ? "Edit an Institute" : "Create New Institute"}
            handleClose={() => {
              setEditMode(false);
              setSelectedInstitute(null);
              setToggleSideBar(false);
            }}
            toggleSideBar={toggleSideBar}
            setLoading={setLoading}
            setInstitutes={setData}
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

export default Institutes;
