import React, {
  HTMLInputTypeAttribute,
  useContext,
  useEffect,
  useState,
} from "react";
import styles from "./Pattern.module.scss";
import {
  Sidebar,
  NotificationCard,
  MUISimpleAutocomplete,
  Button,
} from "../../components";
import { StyledMUITextField } from "../Users/components";
import { IPattern, ISection, ISubSection } from "../../utils/interfaces";
import clsx from "clsx";
import { IconButton, Tooltip } from "@mui/material";
import deleteIcon from "../../assets/icons/delete.svg";
import closeCircleIcon from "../../assets/icons/close-circle.svg";
import {
  CustomAccordion,
  CustomAccordionDetails,
  CustomAccordionSummary,
} from "./components/CustomAccordion";
import tickCircle from "../../assets/icons/tick-circle.svg";
import { AuthContext } from "../../utils/auth/AuthContext";
import axios from "axios";
import { usePermission } from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../utils/constants";
import { Error } from "../";
import { Table } from "antd";
import { NavLink } from "react-router-dom";
import { API_TESTS } from "../../utils/api";

const sampleSection = {
  id: "", // PT_SE_PHY123
  name: "",
  exam: "",
  subject: "",
  subSections: [], // Nesting toBeAttempted
  totalQuestions: 1,
  toBeAttempted: 1,
};

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

const Pattern = () => {
  const isReadPermitted = usePermission(PERMISSIONS.PATTERN.READ);
  // const isCreatePermitted = usePermission(PERMISSIONS.PATTERN.CREATE);
  // const isUpdatePermitted = usePermission(PERMISSIONS.PATTERN.UPDATE);
  // const isDeletePermitted = usePermission(PERMISSIONS.PATTERN.DELETE);
  const [patterns, setPatterns] = useState<IPattern[]>([]);

  const { currentUser } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [exam, setExam] = useState("");

  useEffect(() => {
    if (currentUser) {
      API_TESTS()
        .get(`/pattern/all`)
        .then((res) => {
          setPatterns(
            res.data?.map((item: any) => ({ ...item, key: item._id }))
          );
        });
    }
  }, [currentUser]);

  const columns = [
    {
      title: "ID",
      dataIndex: "_id",
      // render: (text: string) => <a>{text}</a>,
    },
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Exam",
      dataIndex: "exam",
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];
  const [sections, setSections] = useState<Array<ISection>>([]);

  function handleDeleteSection(id: string) {
    setSections(sections.filter((section) => section.id !== id));
  }

  async function handleClickSubmit() {
    if (currentUser) {
      const pattern: IPattern = {
        id: `${currentUser.instituteId}_${name
          .replace(/ /g, "")
          .toUpperCase()}`,
        name,
        exam: exam,
        sections: sections.map((sec) => ({
          ...sec,
          exam: exam,
        })),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        createdBy: {
          userType: currentUser.userType || "",
          id: currentUser.id || "",
        },
        usedIn: [],
      };
      console.log({ pattern });
      const res = await API_TESTS().post(`/pattern/create`, pattern);
      console.log({ res });
    }
  }

  return (
    <>
      {isReadPermitted ? (
        <>
          <section className={styles.container}>
            <div className={styles.header}>
              <NavLink to="/pattern/new">
                <Button>Add New</Button>
              </NavLink>
            </div>
            <div className={styles.data}>
              <Table
                rowSelection={{
                  type: "checkbox",
                  ...rowSelection,
                }}
                columns={columns}
                dataSource={patterns as any}
              />
            </div>
          </section>
          <Sidebar title="Recent Activity">
            {Array(10)
              .fill(0)
              .map((_, i) => (
                <NotificationCard
                  key={i}
                  id="aasdadsd"
                  status={i % 2 === 0 ? "success" : "warning"}
                  title={"New Student Joined-" + i}
                  description="New student join IIT Pulse Anurag Pal - Dropper Batch"
                  createdAt="10 Jan, 2022"
                />
              ))}
          </Sidebar>
        </>
      ) : (
        <Error />
      )}
    </>
  );
};

export default Pattern;
