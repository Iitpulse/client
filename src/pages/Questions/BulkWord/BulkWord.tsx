import { InboxOutlined } from "@ant-design/icons";
import { Save } from "@mui/icons-material";
import { Fab } from "@mui/material";
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
        <div className={styles.dragArea}>
          <DocxReader setQuestions={setQuestions} setLoading={setUploading} />
        </div>
        <div className={styles.tableContainer}>
          <AllQuestionsTable
            loading={uploading}
            questions={questions}
            handleDeleteQuestion={(question: any) => {
              console.log("Deleting question", question);
              setQuestions((prev) =>
                prev.filter((q: any) => q.id !== question.id)
              );
            }}
            noEdit
          />
        </div>
      </section>
      <div className={styles.uploadBtn}>
        <Fab
          variant="extended"
          sx={{ backgroundColor: "var(--clr-primary)", color: "#fff" }}
        >
          <Save sx={{ mr: 1 }} />
          Upload Questions
        </Fab>
      </div>
    </MainLayout>
  );
};

export default BulkWord;
