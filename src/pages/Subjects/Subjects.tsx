import styles from "./Subjects.module.scss";
import { useContext, useEffect, useState } from "react";
import { message, Popconfirm } from "antd";
import {
  Button,
  Card,
  CreatableSelect,
  CustomTable,
  MUIChipsAutocomplete,
  Sidebar,
  StyledMUISelect,
} from "../../components";
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
import { NavLink, useParams } from "react-router-dom";
import CreateNewSubject from "./CreateSubjects";
import { API_QUESTIONS } from "./../../utils/api/config";
import EditIcon from "@mui/icons-material/Edit";
import { Edit } from "@mui/icons-material";

import { Tag } from "antd";
import { set } from "zod";

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

const Subjects = ({
  getColumnSearchProps,
  toggleSideBar,
  setToggleSideBar,
}: {
  getColumnSearchProps: any;
  toggleSideBar: number;
  setToggleSideBar: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>();
  const [editMode, setEditMode] = useState(false);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchSubjects() {
      setLoading(true);
      try {
        const res = await API_QUESTIONS().get(`/subject/Subjects`);
        console.log({ res });
        setData(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_Subjects", error);
        message.error("Error fetching Subjects");
      }
      setLoading(false);
    }

    if (currentUser?.id) {
      fetchSubjects();
    }
  }, [currentUser]);

  const handleDeleteSubjects = async (record: any) => {
    setLoading(true);
    try {
      const res = await API_QUESTIONS().delete(`/subject/subjects`, {
        params: {
          id: record._id,
        },
      });
      if (res?.status === 200) {
        const subjectName: any = data.filter(
          (values: any) => values._id === record._id
        )[0];

        message.success(
          `Successfully deleted Subject ${capitalizeFirstLetter(
            subjectName?.name
          )}`
        );
        setData((data) => data.filter((values: any) => values._id !== record._id));
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
      title: "Name",
      dataIndex: "name",
      key: "name",
      ...getColumnSearchProps("name"),
    },
    {
      title: "chapters",
      dataIndex: "chapters",
      render: (chapters: any) => {
        return chapters?.map((chapter: any) => (
          <Tag
            style={{
              margin: "0.2rem",
            }}
          >
            {" "}
            {chapter.name}
          </Tag>
        ));
      },
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
            setSelectedSubject(record);
            setToggleSideBar(1);
          }}
        />
      ),
    },
    {
      title: "Delete",
      key: "delete",
      render: (_: any, record: any) => (
        <Popconfirm
          title="Sure to delete this Subject?"
          onConfirm={() => {
            handleDeleteSubjects(record);
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
    <Card disablePadding={true} classes={[styles.container]}>
      <div className={styles.header}>
        <CreateNewSubject
          editMode={editMode}
          selectedSubject={selectedSubject}
          title={"Create New Subject"}
          handleClose={() => {
            setEditMode(false);
            setSelectedSubject(null);
            setToggleSideBar(0);
          }}
          toggleSideBar={toggleSideBar === 1}
          setLoading={setLoading}
          setSubjects={setData}
        />
      </div>
      <div className={styles.data}>
        <CustomTable
          scroll={{ x: 200, y: "50vh" }}
          loading={loading}
          columns={columns}
          dataSource={data}
        />
      </div>
      {/* <Sidebar title="Recent Activity">Recent</Sidebar> */}
    </Card>
  );
};

export default Subjects;
