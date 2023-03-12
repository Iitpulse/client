import { InboxOutlined } from "@ant-design/icons";
import { Save } from "@mui/icons-material";
import { Fab } from "@mui/material";
import type { UploadProps } from "antd";
import {useContext} from "react"
import { message, Upload } from "antd";
import { useState } from "react";
import DocxReader from "../../../components/DocxReader/DocxReader";
import MainLayout from "../../../layouts/MainLayout";
import { AllQuestionsTable } from "../Questions";
import styles from "./BulkWord.module.scss";
import { API_QUESTIONS, API_TESTS } from "../../../utils/api";
import { AuthContext } from "../../../utils/auth/AuthContext";
import {Button} from "../../../components";
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
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState<any>({});
  const [file, setFile] = useState(null);
  const { currentUser } = useContext(AuthContext);

  async function handleSubmitAll(){
    // console.log(questions);
    console.log(questions);
    if(questions.length){
      message.loading("Creating Questions...");
      await API_QUESTIONS().post(`/mcq/newbulk`,questions).then(res=>{
        // console.log(res);
        message.success("Questions created successfully");
      }).catch(res=>{
        // console.log(res);
        message.error("Duplicate questions inserted");
      })
    }
    else message.error("Please upload a file")
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
            questions={questions}
            handleDeleteQuestion={(question: any) => {
              // console.log("Deleting question", question);
              setQuestions((prev) =>
                prev.filter((q: any) => q.id !== question.id)
              );
            }}
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
