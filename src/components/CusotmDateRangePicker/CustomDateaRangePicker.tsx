import { DatePicker, Space } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import moment from "moment";
import React from "react";
import styles from "./CustomDateRangePicker.module.scss";

const { RangePicker } = DatePicker;

// eslint-disable-next-line arrow-body-style
const disabledDate: RangePickerProps["disabledDate"] = (current) => {
  // Can not select days before today and today
  return current && current < moment().endOf("day");
};

const CustomDateRangePicker: React.FC<{
  onChange: (values: any, formatString: [string, string]) => void;
  value: any;
}> = ({ onChange, value }) => (
  <RangePicker
    disabledDate={disabledDate}
    onChange={onChange}
    format="DD-MM-YYYY"
    value={value}
    className={styles.cusotmDateRangePicker}
  />
);

export default CustomDateRangePicker;
