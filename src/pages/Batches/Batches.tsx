import styles from "./Batches.module.scss";
import { useState } from "react";
import { Table } from "antd";
import { useNavigate } from "react-router";
import { Button, Sidebar } from "../../components";

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

const Batches = () => {
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      // render: (text: string) => <a>{text}</a>,
    },
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Exam",
      dataIndex: "exam",
      render: (exam: any) => exam.fullName,
    },
    {
      title: "Members",
      dataIndex: "members",
      render: (members: any[]) => members.length,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button>Create New</Button>
      </div>
      <div className={styles.data}>
        <Table
          rowSelection={{
            type: "checkbox",
            ...rowSelection,
          }}
          columns={columns}
          dataSource={data}
        />
      </div>
      <Sidebar title="Recent Activity">Recent</Sidebar>
    </div>
  );
};

export default Batches;
