import React from "react";
import { message, Popconfirm } from "antd";

interface ICustomPopConfirmProps {
  title: string;
  onConfirm: () => void;
  onCancel?: () => void;
  okText: string;
  cancelText: string;
  children: React.ReactNode;
}

const CustomPopConfirm = (props: ICustomPopConfirmProps) => {
  const { title, onConfirm, onCancel, okText, cancelText, children } = props;

  return (
    <Popconfirm
      title={title}
      onConfirm={onConfirm}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      style={{ position: "relative", zIndex: "5" }}
    >
      {children}
    </Popconfirm>
  );
};

export default CustomPopConfirm;
