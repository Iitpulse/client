import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { message, Upload } from "antd";
import { useState } from "react";
import MainLayout from "../../../layouts/MainLayout";
import { AllQuestionsTable } from "../Questions";
import styles from "./BulkWord.module.scss";

const { Dragger } = Upload;

const props: UploadProps = {
  name: "file",
  multiple: true,
  action: "https://www.mocky.io/v2/5cc8019d300000980a055e76",
  onChange(info) {
    const { status } = info.file;
    if (status !== "uploading") {
      console.log(info.file, info.fileList);
    }
    if (status === "done") {
      message.success(`${info.file.name} file uploaded successfully.`);
    } else if (status === "error") {
      message.error(`${info.file.name} file upload failed.`);
    }
  },
  onDrop(e) {
    console.log("Dropped files", e.dataTransfer.files);
  },
};
const BulkWord = () => {
  const [uploading, setUploading] = useState(false);
  const [questions, setQuestions] = useState([]);

  return (
    <MainLayout name="Bulk Upload Word">
      <section className={styles.dragArea}>
        <Dragger {...props}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint">
            Supports single file upload at a time, only upload
            <strong>.docx</strong> files
          </p>
        </Dragger>
      </section>
      <section>
        <AllQuestionsTable
          loading={uploading}
          questions={questions}
          handleDeleteQuestion={(question: any) => {}}
          noEdit
        />
      </section>
    </MainLayout>
  );
};

export default BulkWord;
