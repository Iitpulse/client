import { DatePicker } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import React, { useState, useEffect } from "react";
import styles from "./CustomDateRangePicker.module.scss";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const CustomDateRangePicker: React.FC<{
  onChange: (values: any, formatString: [string, string]) => void;
  value: any;
  showTime?: boolean;
  disablePrevDates?: boolean;
}> = ({ onChange, value, showTime, disablePrevDates }) => {
  const [disableDates, setDisableDates] = useState(disablePrevDates);

  useEffect(() => {
    if (value && value.length === 2) {
      const [startDate, endDate] = value;
      const today = dayjs().startOf("day");
      if (startDate.isBefore(today) || endDate.isBefore(today)) {
        setDisableDates(false);
      } else {
        setDisableDates(true);
      }
    }
  }, [value]);

  const disabledDate: RangePickerProps["disabledDate"] = (current) => {
    return current && current < dayjs().startOf("day");
  };

  return (
    <RangePicker
      showTime={Boolean(showTime)}
      disabledDate={disableDates ? disabledDate : undefined}
      onChange={onChange}
      format="DD-MM-YYYY HH:mm:ss"
      value={value}
      className={styles.CustomDateRangePicker}
    />
  );
};

export default CustomDateRangePicker;
