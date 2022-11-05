import Breadcrumb from "antd/lib/breadcrumb";
import React from "react";
import { Link } from "react-router-dom";
import styles from "./styles.module.scss";

const CustomBreadCrumb: React.FC<{
  location: string;
}> = ({ location }) => {
  let items = location.split("/");
  if (items[2] === "result") {
    items = ["", "test", items[items.length - 1]];
  }
  console.log({ items });
  return (
    <Breadcrumb className={styles.breadcrumb}>
      {items.map((item, idx) => {
        // eslint-disable-next-line array-callback-return
        if (idx === 0) return;
        let str = "";

        for (let i = 1; i <= idx; i++) str += items[i] + (i === idx ? "" : "/");
        return (
          <Breadcrumb.Item>
            <Link to={`/${str}`}>{item}</Link>
          </Breadcrumb.Item>
        );
      })}
    </Breadcrumb>
  );
};
export default CustomBreadCrumb;
