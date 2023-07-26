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
import Sources from "../Sources/Sources";
import Classes from "../Class/Classes";
import { SearchOutlined } from "@ant-design/icons";
import type { InputRef } from "antd";
import { Input, Space, Table } from "antd";
import type { ColumnType, ColumnsType } from "antd/es/table";
import type { FilterConfirmProps } from "antd/es/table/interface";
import { useRef } from "react";
import Highlighter from "react-highlight-words";

const SubjectManagement: React.FC = () => {
  const [toggleSideBar, setToggleSideBar] = useState(0);
  const [tab, setTab] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<InputRef>(null);

  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: string
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (
    dataIndex: string
  ): ColumnType<{
    key: React.Key;
  }> => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() =>
            handleSearch(selectedKeys as string[], confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() =>
              handleSearch(selectedKeys as string[], confirm, dataIndex)
            }
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
              setSearchText((selectedKeys as string[])[0]);
              setSearchedColumn(dataIndex);
            }}
          >
            Filter
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
    ),
    onFilter: (value, record: any) =>
      record[dataIndex]
        ?.toString()
        ?.toLowerCase()
        ?.includes((value as string).toLowerCase()),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  });
  

  // const onChange = (key: string) => {
  //   console.log(key);
  //   setTab(parseInt(key));
  // };
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: `Subjects`,
      children: (
        <Subjects
          getColumnSearchProps={getColumnSearchProps}
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
          getColumnSearchProps={getColumnSearchProps}
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
          getColumnSearchProps={getColumnSearchProps}
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
          getColumnSearchProps={getColumnSearchProps}
          toggleSideBar={toggleSideBar}
          setToggleSideBar={setToggleSideBar}
        />
      ),
    },

    {
      key: "5",
      label: `Sources`,
      children: (
        <Sources
          getColumnSearchProps={getColumnSearchProps}
          toggleSideBar={toggleSideBar}
          setToggleSideBar={setToggleSideBar}
        />
      ),
    },
    {
      key: "6",
      label: `Classes`,
      children: (
        <Classes
          getColumnSearchProps={getColumnSearchProps}
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
