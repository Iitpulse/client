import React from "react";
import { Badge, Calendar, Tag } from "antd";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { ITest } from "../../../utils/interfaces";
import styles from "./ScheduleCalendar.module.scss";
dayjs.extend(isBetween);

interface CalendarViewProps {
  data: ITest[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ data }) => {
  const dateCellRender = (value: any) => {
    const listData = data?.filter((test) =>
      dayjs(value).isBetween(
        dayjs(test.validity.from),
        dayjs(test.validity.to),
        null,
        "[]"
      )
    );

    function isTestExpired(test: ITest) {
      return dayjs().isAfter(dayjs(test.validity.to));
    }

    function getColorByStatus(item: ITest) {
      return isTestExpired(item)
        ? "error"
        : item.status === "Ongoing"
        ? "success"
        : item.status === "Active"
        ? "warning"
        : "error";
    }

    return (
      <ul className={styles.events}>
        {listData?.map((item) => (
          <li key={item.id}>
            <Tag color="blue">{item.exam.name}</Tag>
            <Badge
              className={styles.testTitle}
              status={getColorByStatus(item)}
              text={item.name}
            />
          </li>
        ))}
      </ul>
    );
  };

  return <Calendar dateCellRender={dateCellRender} />;
};

export default CalendarView;
