import Breadcrumb from "antd/lib/breadcrumb";
import React from "react";
import { Link } from "react-router-dom";
import styles from "./styles.module.scss";

const CustomBreadCrumb: React.FC<{
  location: string;
  name?: string;
}> = ({ location, name }) => {
  let items = location.split("/");
  if (items[2] === "result") {
    items = ["", "test", items[items.length - 1]];
  }
  if (items[1] === "pattern" && items.length !== 2) {
    items = ["", "pattern", items[items.length - 1]];
  }
  return (
    <Breadcrumb className={styles.breadcrumb}>
      {name ? (
        <Breadcrumb.Item>
          <Link to={`/`}>{name}</Link>
        </Breadcrumb.Item>
      ) : (
        items.map((item, idx) => {
          // eslint-disable-next-line array-callback-return
          if (idx === 0) return;
          let str = "";

          for (let i = 1; i <= idx; i++)
            str += items[i] + (i === idx ? "" : "/");
          if (idx === items.length - 1) {
            item = item[0].toLocaleUpperCase() + item.slice(1);
            return (
              <Breadcrumb.Item key={`/${str}`}>
                <p>{item}</p>
              </Breadcrumb.Item>
            );
          }
          return (
            <Breadcrumb.Item key={`/${str}`}>
              <Link to={`/${str}`}>{item}</Link>
            </Breadcrumb.Item>
          );
        })
      )}
    </Breadcrumb>
  );
};
export default CustomBreadCrumb;
