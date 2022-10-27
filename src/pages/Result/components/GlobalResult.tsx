import { Link } from "react-router-dom";
import CustomTable from "../../../components/CustomTable/CustomTable";
import styles from "./GlobalResult.module.scss";

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

  return (
    <div className={styles.container}>
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
