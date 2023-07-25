import styles from "./Exams.module.scss";
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
import { API_TESTS, API_USERS } from "../../utils/api/config";
import deleteIcon from "../../assets/icons/delete.svg";

import CreateNewExam from "./CreateExams";
import { API_QUESTIONS } from "../../utils/api/config";
import EditIcon from "@mui/icons-material/Edit";
import dayjs from "dayjs";

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

const Exams = ({
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
  const [selectedExam, setSelectedExam] = useState<any>();
  const [editMode, setEditMode] = useState(false);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchExams() {
      setLoading(true);
      try {
        const res = await API_TESTS().get(`/exam/all`);
        console.log({ res });
        setData(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_Exams", error);
        message.error("Error fetching Exams");
      }
      setLoading(false);
    }

    if (currentUser?.id) {
      fetchExams();
    }
  }, [currentUser]);

  const handleDeleteExams = async (id: string) => {
    setLoading(true);
    try {
      const res = await API_TESTS().delete(`/exam/delete/` + id);
      if (res?.status === 200) {
        let exam: any = data.filter((values: any) => values._id !== id);

        message.success("Successfully deleted Exam " + exam[0].name);
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
      ...getColumnSearchProps("name"),
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      ...getColumnSearchProps("fullName"),
    },
    {
      title: "Modified At",
      dataIndex: "modifiedAt",
      render: (text: any, record: any) => {
        console.log({ text, record });
        return <p>{dayjs(text).format("DD-MM-YYYY")}</p>;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      render: (text: any, record: any) => {
        console.log({ text, record });
        return <p>{dayjs(text).format("DD-MM-YYYY")}</p>;
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
            setSelectedExam(record);
            setToggleSideBar(4);
          }}
        />
      ),
    },
    {
      title: "Delete",
      key: "delete",
      render: (_: any, record: any) => (
        <Popconfirm
          title="Sure to delete this Exam?"
          onConfirm={() => {
            console.log(record);
            handleDeleteExams(record?._id);
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
        <CreateNewExam
          editMode={editMode}
          selectedExam={selectedExam}
          title={editMode ? "Edit an Exam" : "Create New Exam"}
          handleClose={() => {
            setEditMode(false);
            setSelectedExam(null);
            setToggleSideBar(0);
          }}
          toggleSideBar={toggleSideBar === 4}
          setLoading={setLoading}
          setExams={setData}
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

export default Exams;
