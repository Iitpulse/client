import { Link } from "react-router-dom";

export function hasPatternPemissions(
  permissions: {
    isReadPermitted: boolean;
    isCreatePermitted: boolean;
    isUpdatePermitted: boolean;
  },
  patternId: any
): boolean {
  return (
    permissions.isReadPermitted &&
    permissions.isCreatePermitted &&
    (patternId ? permissions.isUpdatePermitted : true)
  );
}

export const columns = [
  // {
  //   title: "ID",
  //   dataIndex: "_id",
  //   render: (text: string) => (
  //     <Link
  //       to={`/pattern/edit/${text}`}
  //       style={{
  //         textOverflow: "ellipsis",
  //         overflow: "hidden",
  //         whiteSpace: "nowrap",
  //         maxWidth: "50px",
  //       }}
  //     >
  //       {text}
  //     </Link>
  //   ),
  // },
  {
    title: "Name",
    dataIndex: "name",
    render: (text: string, record: any) => (
      <Link
        to={`/pattern/edit/${record._id}`}
        style={{
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "nowrap",
          maxWidth: "150px",
          // background: "red",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <span
          style={{
            display: "inline-block",
            maxWidth: "100%",
            overflow: "hidden",
            // background: "blue",
            // opacity: 0.5,
            textOverflow: "ellipsis",
          }}
        >
          {text}
        </span>
      </Link>
    ),
  },
  {
    title: "Exam",
    dataIndex: "exam",
  },
  {
    title: "Test Duration",
    dataIndex: "durationInMinutes",
    render: (duration: number) => (
      <span>{convertMinutesToHoursAndMinutes(duration)}</span>
    ),
  },
  {
    title: "Created At",
    dataIndex: "createdAt",
    render: (date: string) => new Date(date).toDateString(),
  },
  {
    title: "Created By",
    dataIndex: "createdBy",
    render: (createdBy: any) => (
      <span style={{ textTransform: "uppercase" }}>{createdBy.userType}</span>
    ),
  },
  {
    title: "Delete",
    key: "action",
    dataIndex: "_id",
  },
];

// convert minutes to hours and minutes
export function convertMinutesToHoursAndMinutes(minutes: number) {
  if (!minutes) {
    return "NA";
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} h ${mins} m`;
}
