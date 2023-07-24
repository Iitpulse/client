import React, { useState } from "react";
import { Button, Card, Tabs } from "antd";
import type { TabsProps } from "antd";
import Subjects from "../Subjects/Subjects";
import MainLayout from "../../layouts/MainLayout";
import Chapters from "../Chapters/Chapters";
import AddIcon from "@mui/icons-material/Add";
import styles from "./SubjectManagement.module.scss";
import Topics from "../Topics/Topics";
import Exams from "../Exams/Exams";

const SubjectManagement: React.FC = () => {
  const [toggleSideBar, setToggleSideBar] = useState(0);
  const [tab, setTab] = useState(1);
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
    },
    {
      key: "4",
      label: `Exams`,
      children: (
        <Exams
          toggleSideBar={toggleSideBar}
          setToggleSideBar={setToggleSideBar}
        />
      ),
    },
  ];
  const [nameTab, setNameTab] = useState<any>(items[0].label);
  const onChange = (key: string) => {
    console.log(key);
    setTab(parseInt(key));
    setNameTab(items[Number(key)-1].label);
    console.log(nameTab)
  };
  return (
    <MainLayout
      name={nameTab}
      menuActions={
        <Button
          type="primary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setToggleSideBar(tab)}
          icon={<AddIcon />}
        >
          Create New
        </Button>
      }
    >
      <Card
        style={{
          width: "100%",
        }}
      >
        <Tabs
          style={{
            width: "100%",
          }}
          defaultActiveKey="1"
          items={items}
          onChange={onChange}
        />
      </Card>
    </MainLayout>
  );
};

export default SubjectManagement;
