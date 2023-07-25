import { Link } from "react-router-dom";
import CustomTable from "../../../components/CustomTable/CustomTable";
import styles from "./GlobalResult.module.scss";
import { Button, Input, InputRef, Space } from "antd";
import { useRef, useState } from "react";
import { FilterConfirmProps } from "antd/es/table/interface";
import { SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";

interface IGlobalResult {
  testName: string;
  testId: string;
  testExamName: string;
  students: Array<{
    name: string;
    marks: number;
    submittedOn: string;
    id: string;
  }>;
}

const GlobalResult: React.FC<IGlobalResult> = ({
  students,
  testName,
  testId,
  testExamName,
}) => {
  const cols: any = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      //   width: 100,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, row: any) => (
        <Link
          to={`/test/result/${testName}/${testExamName}/${testId}/student/${row._id}`}
        >
          {name}
        </Link>
      ),
      searchable: true,
    },
    {
      title: "Marks",
      dataIndex: "marks",
      key: "marks",
      //   width: 100,
    },
    {
      title: "Submitted On",
      dataIndex: "submittedOn",
      key: "submittedOn",
      //   width: 200,
      render: (submittedOn: string) =>
        submittedOn
          ? new Date(submittedOn).toDateString()
          : new Date().toDateString(),
    },
  ];
  const downloadStudentsAsCSV = () => {
    const csv = [
      "Rank,Student Name,Marks,Submitted On",
      ...students
        ?.sort((a, b) => b.marks - a.marks)
        ?.map((student, index) => {
          return `${index + 1},${student.name},${student.marks},${
            student.submittedOn
          }`;
        }),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", `${testName}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={styles.container}>
      <Button
        style={{
          float: "right",
        }}
        onClick={downloadStudentsAsCSV}
        type="primary"
      >
        Download as CSV
      </Button>
      <CustomTable
        columns={cols}
        dataSource={students?.map((student: any, i: number) => ({
          ...student,
          key: i,
          rank: i + 1,
        }))}
        scroll={{ x: 500, y: 300 }}
        selectable={false}
      />
    </div>
  );
};

export default GlobalResult;
