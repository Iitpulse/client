import { Link } from "react-router-dom";
import { ZodError } from "zod";
import { PatternFormSchema, PatternFormSchemaType } from "./types";
import { IPattern, ISection } from "../../utils/interfaces";

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
      <span
        style={{
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "nowrap",
          maxWidth: "150px",
          width: "100%",
          display: "inline-block",
        }}
      >
        <Link to={`/pattern/edit/${record._id}`}>{text}</Link>
      </span>
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

export const isPatternFormFilled = (
  setHelperTexts: React.Dispatch<React.SetStateAction<any>>,
  defaultState: PatternFormSchemaType,
  data: {
    name: string;
    exam: string;
    durationInMinutes: string;
    sections: Array<ISection>;
  }
) => {
  setHelperTexts(defaultState);
  // const { test, batches, status, testDateRange, pattern } = data;
  const { name, exam, durationInMinutes, sections } = data;
  try {
    // This will throw an error if the validation fails
    console.log("data", data);
    PatternFormSchema.parse({
      name,
      exam,
      durationInMinutes,
      sections,
    });

    // If the above line didn't throw, validation passed
    return true;
  } catch (error) {
    if (error instanceof ZodError) {
      error.errors.forEach((issue) => {
        let path = issue.path.join(".");
        let message = issue.message;
        setHelperTexts((prevState: any) => ({
          ...prevState,
          [path]: message,
        }));
      });
    } else {
      console.error(error);
    }
    return false;
  }
};
