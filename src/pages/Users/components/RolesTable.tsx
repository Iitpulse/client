import React from "react";
import { DatePicker, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

interface DataType {
  role: string;
  onChange: (date: any, dateString: any) => void;
}

const columns: ColumnsType<DataType> = [
  {
    title: "Role",
    dataIndex: "role",
    key: "role",
    render: (text) => <p>{text}</p>,
  },

  {
    title: "Validity",
    key: "validity",
    render: (_, record) => (
      <DatePicker.RangePicker
        format="DD-MM-YYYY"
        onChange={record.onChange}
        getPopupContainer={(trigger) => trigger.parentElement!}
      />
    ),
  },
];

const RolesTable: React.FC<{
  roles: string[];
  updateValidity: (role: string, e: any) => void;
}> = ({ updateValidity, roles }) => {
  const data: DataType[] = roles?.map((role: string) => ({
    role,
    onChange: (e: any) => {
      updateValidity(role, e);
      // updateValidity({ from: dateString[0], to: dateString[1] });
    },
  }));

  return (
    <Table
      style={{
        width: "100%",
      }}
      columns={columns}
      dataSource={data}
      pagination={false}
    />
  );
};
export default RolesTable;
