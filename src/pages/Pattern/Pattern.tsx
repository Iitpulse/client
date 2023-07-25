import React, { useCallback, useContext, useEffect, useState } from "react";
import styles from "./Pattern.module.scss";
import { Card, CustomTable } from "../../components";
import { Button } from "antd";
import { IPattern } from "../../utils/interfaces";
import { IconButton } from "@mui/material";
import deleteIcon from "../../assets/icons/delete.svg";
import { AuthContext } from "../../utils/auth/AuthContext";
import { usePermission } from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../utils/constants";
import { Error } from "../";
import { message, Popconfirm } from "antd";
import { NavLink } from "react-router-dom";
import { API_TESTS } from "../../utils/api/config";
import MainLayout from "../../layouts/MainLayout";
import { columns } from "./utils";
import AddIcon from "@mui/icons-material/Add";

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
  const [patterns, setPatterns] = useState<Array<IPattern>>([]);

  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchPatterns() {
      const res = await API_TESTS().get(`/pattern/all`);
      setPatterns(
        res.data?.map((item: any) => ({ ...item, id: item._id, key: item._id }))
      );
      setLoading(false);
    }
    if (currentUser) {
      setLoading(true);
      fetchPatterns();
    }
  }, [currentUser]);

  const handleDeletePattern = useCallback(async (id: string) => {
    setLoading(true);
    const antLoading = message.loading("Deleting Pattern", 0);
    try {
      await API_TESTS().delete(`/pattern/delete`, {
        params: { id },
      });
      setPatterns((prev) => prev.filter((pattern) => pattern._id !== id));
      antLoading();
      setLoading(false);
      message.success("Pattern Deleted Successfully");
    } catch (error) {
      console.log("ERROR_DELETING_PATTERN", error);
      antLoading();
      message.error("Error Deleting Pattern");
    }
    setLoading(false);
  }, []);

  return (
    <MainLayout
      name="Pattern"
      menuActions={
        isCreatePermitted && (
          <NavLink to="/pattern/new">
            <Button
              type="primary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              icon={<AddIcon />}
            >
              Add New
            </Button>
          </NavLink>
        )
      }
    >
      {isReadPermitted ? (
        <>
          <Card classes={[styles.container]}>
            <div className={styles.header}>
              <span></span>
            </div>
            <div className={styles.data}>
              <CustomTable
                loading={loading}
                selectable={false}
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
                dataSource={patterns}
                scroll={{ x: 500, y: 600 }}
              />
            </div>
          </Card>
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
