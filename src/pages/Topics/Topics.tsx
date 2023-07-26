import styles from "./Topics.module.scss";
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
import { NavLink } from "react-router-dom";
import CreateNewTopic from "./CreateTopics";
import { API_QUESTIONS } from "../../utils/api/config";
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

const Topics = ({
  toggleSideBar,
  setToggleSideBar,
  getColumnSearchProps,
}: {
  getColumnSearchProps: any;
  toggleSideBar: number;
  setToggleSideBar: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any>();
  const [editMode, setEditMode] = useState(false);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchTopics() {
      setLoading(true);
      try {
        const res = await API_QUESTIONS().get(`/subject/topic/all`);
        console.log({ res });
        setData(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_Topics", error);
        message.error("Error fetching Topics");
      }
      setLoading(false);
    }

    if (currentUser?.id) {
      fetchTopics();
    }
  }, [currentUser]);

  const handleDeleteTopics = async (value: {
    subjectId: string;
    chapter: string;
    topic: string;
  }) => {
    setLoading(true);
    try {
      console.log(value);
      const res = await API_QUESTIONS().post(`/subject/topic/delete`, value);
      if (res?.status === 200) {
        message.success("Topic " + value.topic + " Deleted Successfully");
        setData((data) =>
          data.filter((values: any) => values.topic !== value.topic)
        );
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
      dataIndex: "topic",
      ...getColumnSearchProps("topic"),
    },
    {
      title: "Subject",
      dataIndex: "subject",
      ...getColumnSearchProps("subject"),
    },
    {
      title: "Chapter",
      dataIndex: "chapter",
      ...getColumnSearchProps("chapter"),
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
            setSelectedTopic(record);
            setToggleSideBar(3);
          }}
        />
      ),
    },
    {
      title: "Delete",
      key: "delete",
      render: (_: any, record: any) => (
        <Popconfirm
          title="Sure to delete this Topic?"
          onConfirm={() => {
            console.log(record);
            handleDeleteTopics({
              subjectId: record?.subjectId,
              chapter: record?.chapter,
              topic: record?.topic,
            });
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
        <CreateNewTopic
          editMode={editMode}
          selectedTopic={selectedTopic}
          title={"Create New Topic"}
          handleClose={() => {
            setEditMode(false);
            setSelectedTopic(null);
            setToggleSideBar(0);
          }}
          toggleSideBar={toggleSideBar === 3}
          setLoading={setLoading}
          setTopics={setData}
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

export default Topics;
