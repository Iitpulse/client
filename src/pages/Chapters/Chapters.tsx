import styles from "./Chapters.module.scss";
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
import CreateNewChapter from "./CreateChapters";
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

const Chapters = ({
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
  const [selectedChapter, setSelectedChapter] = useState<any>();
  const [editMode, setEditMode] = useState(false);
  const { currentUser } = useContext(AuthContext);

  const { subjects: subjectOptions } = useContext(TestContext);

  useEffect(() => {
    async function fetchChapters() {
      setLoading(true);
      try {
        const res = await API_QUESTIONS().get(`/subject/chapter/all`);
        console.log({ res });
        setData(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_Chapters", error);
        message.error("Error fetching Chapters");
      }
      setLoading(false);
    }

    if (currentUser?.id) {
      fetchChapters();
    }
  }, [currentUser]);

  const handleDeleteChapters = async ({
    subject,
    chapter,
  }: {
    subject: string;
    chapter: string;
  }) => {
    setLoading(true);
    try {
      const subjectId = subjectOptions.find(
        (value) => value.name === subject
      )._id;
      console.log(subjectOptions, subjectId);
      const res = await API_QUESTIONS().post(`/subject/chapter/delete`, {
        subjectId,
        chapter,
      });
      if (res?.status === 200) {
        // console.log(res, chapter);
        message.success(
          `Successfully deleted ${capitalizeFirstLetter(chapter)}`
        );
        setData((data) =>
          data.filter((values: any) => values.name !== chapter)
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
      dataIndex: "name",
      ...getColumnSearchProps("name"),
    },
    {
      title: "Subject",
      dataIndex: "subject",
      ...getColumnSearchProps("subject"),
    },
    {
      title: "Topics",
      dataIndex: "topics",
      render: (topics: any) => {
        return (
          <>
            {topics?.map((topic: any) => (
              <Tag
                style={{
                  margin: "0.2rem",
                }}
                color="blue"
              >
                {topic}
              </Tag>
            ))}
          </>
        );
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
            setSelectedChapter(record);
            setToggleSideBar(2);
          }}
        />
      ),
    },
    {
      title: "Delete",
      key: "delete",
      render: (_: any, record: any) => (
        <Popconfirm
          title="Sure to delete this Chapter?"
          onConfirm={() => {
            console.log(record);
            handleDeleteChapters({
              subject: record.subject,
              chapter: record.name,
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
        <CreateNewChapter
          editMode={editMode}
          selectedChapter={selectedChapter}
          title={"Create New Chapter"}
          handleClose={() => {
            setEditMode(false);
            setSelectedChapter(null);
            setToggleSideBar(0);
          }}
          toggleSideBar={toggleSideBar === 2}
          setLoading={setLoading}
          setChapters={setData}
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

export default Chapters;
