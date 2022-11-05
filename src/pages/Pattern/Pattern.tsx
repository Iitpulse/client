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
import { message, Popconfirm, Table } from "antd";
import { Link, NavLink } from "react-router-dom";
import { API_TESTS } from "../../utils/api";
import MainLayout from "../../layouts/MainLayout";
import { columns } from "./utils";

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
  const isCreatePermitted = usePermission(PERMISSIONS.PATTERN.CREATE);
  const isUpdatePermitted = usePermission(PERMISSIONS.PATTERN.UPDATE);
  const isDeletePermitted = usePermission(PERMISSIONS.PATTERN.DELETE);
  const [loading, setLoading] = useState(false);
  const [patterns, setPatterns] = useState<IPattern[]>([]);

  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      API_TESTS()
        .get(`/pattern/all`)
        .then((res) => {
          setPatterns(
            res.data?.map((item: any) => ({ ...item, key: item._id }))
          );
          setLoading(false);
        })
        .catch((err) => {
          setLoading(false);
        });
    }
  }, [currentUser]);

  async function handleDeletePattern(id: string) {
    setLoading(true);
    const antLoading = message.loading("Deleting Pattern", 0);
    try {
      await API_TESTS().delete(`/pattern/delete`, {
        params: { id },
      });
      setPatterns(patterns.filter((pattern) => pattern.id !== id));
      antLoading();
      message.success("Pattern Deleted Successfully");
    } catch (error) {
      console.log("ERROR_DELETING_PATTERN", error);
      antLoading();
      message.error("Error Deleting Pattern");
    }
    setLoading(false);
  }

  return (
    <MainLayout name="Pattern">
      {isReadPermitted ? (
        <>
          <section className={styles.container}>
            <div className={styles.header}>
              {isCreatePermitted && (
                <NavLink to="/pattern/new">
                  <Button>Add New</Button>
                </NavLink>
              )}
            </div>
            <div className={styles.data}>
              <Table
                rowSelection={{
                  type: "checkbox",
                  ...rowSelection,
                }}
                columns={columns
                  ?.filter((col: any) =>
                    col.key === "action" ? isDeletePermitted : true
                  )
                  .map((col: any) => {
                    if (col.key !== "action") return col;
                    return {
                      ...col,
                      render: (id: string) => (
                        <Popconfirm
                          title="Sure to delete?"
                          onConfirm={() => handleDeletePattern(id)}
                        >
                          <IconButton>
                            <img src={deleteIcon} alt="delete" />
                          </IconButton>
                        </Popconfirm>
                      ),
                    };
                  })}
                dataSource={patterns as any}
                scroll={{ x: 500, y: 600 }}
              />
            </div>
          </section>
          {/* <Sidebar title="Recent Activity">
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
          </Sidebar> */}
        </>
      ) : (
        <Error />
      )}
    </MainLayout>
  );
};

export default Pattern;
