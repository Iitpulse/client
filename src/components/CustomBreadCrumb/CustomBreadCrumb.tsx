import Breadcrumb from "antd/lib/breadcrumb";
import React from "react";
import { Link } from "react-router-dom";

const CustomBreadCrumb: React.FC<{
  location: string;
}> = ({ location }) => {
  let items = location.split("/");
  if (items[2] == "result") {
    items = ["", "test", items[items.length - 1]];
  }
  console.log({ items });
  return (
    <Breadcrumb>
      {items.map((item, idx) => {
        if (idx == 0) return;
        let str = "";

        for (let i = 1; i <= idx; i++) str += items[i] + (i == idx ? "" : "/");
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
