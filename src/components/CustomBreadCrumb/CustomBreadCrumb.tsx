import Breadcrumb from "antd/lib/breadcrumb";
import React from "react";
import { Link } from "react-router-dom";
import styles from "./styles.module.scss";

const CustomBreadCrumb: React.FC<{
  location: string;
  name?: string;
}> = ({ location, name }) => {
  const generateBreadcrumbs = (location: String) => {
    const validPaths = [
    "test",
    "subjects",
    "institutes",
    "questions",
    "questionsnew",
    "new",
    "new-bulk-word",
    "login",
    "batches",
    "pattern",
    "ongoing-test",
    "upcoming-test",
    "roles",
    "users",
    "student-register",
    "reset-password"
  ]
    let items = location.split("/");
    let newItems = []
    for(let i=0;i<items.length;i++){
      if (items[i]===""){
        newItems.push({ name: 'Home', path: '/' })
      }else if(validPaths.includes(items[i])){
        console.log("true")
        newItems.push({name: items[i], path: `${items.slice(0, i + 1).join('/')}`})
      }else if(items[i]==="edit" || items[i]==="profile" || items[i]==="student"){
        newItems.push({name: items[i], path: `${items.slice(0, i + 2).join('/')}`})
      }else if(items[i]==="result"){
        newItems.push({name: items[i], path: `${items.slice(0, i + 4).join('/')}`})
      }
    }
    return newItems;
  };
  const crumbs = generateBreadcrumbs(location);

  return (
    <Breadcrumb className={styles.breadcrumb}>
      {(!crumbs || crumbs.length ==0 || location.length == 1) ? (
        <Breadcrumb.Item>
          <Link to={`/`}>{name}</Link>
        </Breadcrumb.Item>
      ) : (
        // map function
        crumbs.map((item,idx)=>{
          name = item.name;
          name = name[0].toLocaleUpperCase() + name.slice(1)

          return (
          <Breadcrumb.Item>
            <Link to={item.path}>{name}</Link>
          </Breadcrumb.Item>
          );
        })
      )}
    </Breadcrumb>
  );
};
export default CustomBreadCrumb;
