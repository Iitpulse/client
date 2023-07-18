import { InboxOutlined } from "@ant-design/icons";
import { Save } from "@mui/icons-material";
import { Fab } from "@mui/material";
import type { UploadProps } from "antd";
import { useContext } from "react";
import { message, Upload } from "antd";
import { useState } from "react";
import DocxReader from "../../../components/DocxReader/DocxReader";
import MainLayout from "../../../layouts/MainLayout";
import { AllQuestionsTable } from "../Questions";
import styles from "./BulkWord.module.scss";
import { API_QUESTIONS, API_TESTS } from "../../../utils/api/config";
import { AuthContext } from "../../../utils/auth/AuthContext";
import { Button } from "../../../components";
import {
  IQuestionObjective,
  IQuestionInteger,
  IQuestionParagraph,
  IQuestionMatrix,
} from "../../../utils/interfaces";
import { checkQuestionValidity } from "../utils";

const defaultErrorObject = {
  objective: {
    type: false,
    topics: false,
    subject: false,
    chapters: false,
    difficulty: false,
    exams: false,
    sources: false,
    en: false,
    hi: false,
    options: false,
    correctAnswers: false,
    uploadedBy: false,
  },
  integer: {},
  paragraph: {},
  matrix: {},
};

const BulkWord = () => {
  const [uploading, setUploading] = useState(false);
  const [questions, setQuestions] = useState({
    single: [],
    multiple: [],
    integer: [],
    paragraph: [],
    matrix: [],
  });
  const [error, setError] = useState<any>({});
  const [file, setFile] = useState(null);
  const { currentUser } = useContext(AuthContext);

  async function submitMCQ() {
    return await API_QUESTIONS().post(`/mcq/new-bulk`, [
      ...questions.single,
      ...questions.multiple,
    ]);
  }

  async function submitInteger() {
    return await API_QUESTIONS().post(`/numerical/new-bulk`, questions.integer);
  }

  async function submitParagraph() {
    return await API_QUESTIONS().post(
      `/paragraph/new-bulk`,
      questions.paragraph
    );
  }

  async function handleSubmitAll() {
    try {
      setUploading(true);
      const res = await Promise.all([
        submitMCQ(),
        submitInteger(),
        submitParagraph(),
      ]);
      // console.log("ressss ->", res);
      message.success("Questions uploaded successfully");
      setQuestions({
        single: [],
        multiple: [],
        integer: [],
        paragraph: [],
        matrix: [],
      });
      setUploading(false);
    } catch (error) {
      console.log(error);
      message.error("Error uploading questions");
      setUploading(false);
    }
  }

  function handleDelete(question: any) {
    setQuestions((prev: any) => {
      switch (question.type) {
        case "single":
          return {
            ...prev,
            single: prev?.single?.filter((q: any) => q._id !== question._id),
          };
        case "multiple":
          return {
            multiple: prev?.multiple?.filter((q: any) => q._id !== question._id),
          };
        case "integer":
          return {
            ...prev,
            integer: prev?.integer?.filter((q: any) => q._id !== question._id),
          };
        case "paragraph":
          return {
            ...prev,
            paragraph: prev?.paragraph?.filter(
              (q: any) => q._id !== question._id
            ),
          };
        case "matrix":
          return {
            ...prev,
            matrix: prev?.matrix?.filter((q: any) => q._id !== question._id),
          };
      }
    });
  }

  return (
    <MainLayout name="Bulk Upload Word">
      <section>
        <div className={styles.dragArea}>
          <DocxReader setQuestions={setQuestions} setLoading={setUploading} />
        </div>
        <div className={styles.tableContainer}>
          <AllQuestionsTable
            loading={uploading}
            questions={[
              ...questions.single,
              ...questions.multiple,
              ...questions.integer,
              ...questions.paragraph,
            ]}
            handleDeleteQuestion={handleDelete}
            noEdit
          />
        </div>
      </section>
      <section>
        <div className={styles.uploadBtn}>
          <Fab
            variant="extended"
            sx={{ backgroundColor: "var(--clr-primary)", color: "#fff" }}
            onClick={handleSubmitAll}
          >
            <Save sx={{ mr: 1 }} />
            Upload Questions
          </Fab>
        </div>
      </section>
    </MainLayout>
  );
};

export default BulkWord;
