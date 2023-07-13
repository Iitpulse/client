import React, { useState } from "react";
import { Button, Tabs } from "antd";
import type { TabsProps } from "antd";
import Subjects from "../Subjects/Subjects";
import MainLayout from "../../layouts/MainLayout";
import Chapters from "../Chapters/Chapters";
import AddIcon from "@mui/icons-material/Add";
import styles from "./SubjectManagement.module.scss";
import Topics from "../Topics/Topics";

const onChange = (key: string) => {
  console.log(key);
};

const SubjectManagement: React.FC = () => {
  const [toggleSideBar, setToggleSideBar] = useState(false);
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: `Subjects`,
      children: (
        <Subjects
          toggleSideBar={toggleSideBar}
          setToggleSideBar={setToggleSideBar}
        />
      ),
    },
    {
      key: "2",
      label: `Chapters`,
      children: (
        <Chapters
          toggleSideBar={toggleSideBar}
          setToggleSideBar={setToggleSideBar}
        />
      ),
    },
    {
      key: "3",
      label: `Topics`,
      children: (
        <Topics
          toggleSideBar={toggleSideBar}
          setToggleSideBar={setToggleSideBar}
        />
      ),
    }
  ];
  return (
    <MainLayout name="Subjects Management">
      <Tabs
        className={styles.tabs}
        tabBarExtraContent={
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
        style={{
          width: "100%",
        }}
        defaultActiveKey="1"
        items={items}
        onChange={onChange}
      />
    </MainLayout>
  );
};

export default SubjectManagement;
