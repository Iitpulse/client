import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { message, Upload } from "antd";
import { useState } from "react";
import DocxReader from "../../../components/DocxReader/DocxReader";
import MainLayout from "../../../layouts/MainLayout";
import { AllQuestionsTable } from "../Questions";
import styles from "./BulkWord.module.scss";

const BulkWord = () => {
  const [uploading, setUploading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [file, setFile] = useState(null);

  return (
    <MainLayout name="Bulk Upload Word">
      <section>
        <section className={styles.dragArea}>
          <DocxReader setQuestions={setQuestions} />
        </section>
        <section className={styles.tableContainer}>
          <AllQuestionsTable
            loading={uploading}
            questions={questions}
            handleDeleteQuestion={(question: any) => {}}
            noEdit
          />
        </section>
      </section>
    </MainLayout>
  );
};

export default BulkWord;