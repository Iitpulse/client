import { DatePicker } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import React from "react";
import styles from "./CustomDateRangePicker.module.scss";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

// eslint-disable-next-line arrow-body-style
const disabledDate: RangePickerProps["disabledDate"] = (current) => {
  // Can not select days before today and today
  return current && current < dayjs().endOf("day");
};

const CustomDateRangePicker: React.FC<{
  onChange: (values: any, formatString: [string, string]) => void;
  value: any;
  showTime?: boolean;
  disablePrevDates?: boolean;
}> = ({ onChange, value, showTime, disablePrevDates }) =>
  disablePrevDates ? (
    <RangePicker
      showTime={Boolean(showTime)}
      disabledDate={disabledDate}
      onChange={onChange}
      format="DD-MM-YYYY"
      value={value}
      className={styles.CustomDateRangePicker}
    />
  ) : (
    <RangePicker
      showTime={Boolean(showTime)}
      onChange={onChange}
      format="DD-MM-YYYY"
      value={value}
      className={styles.CustomDateRangePicker}
    />
  );

export default CustomDateRangePicker;
