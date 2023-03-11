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


  // function handleSubmitAll(){
  //   questions.forEach(ques => {
  //     // // console.log("chal gaya bhai");
  //     handleSubmitQuestion(ques);
  //   });
  // }

  // async function handleSubmitQuestion(ques : any) {
  //   try {
  //     // console.log(ques);
  //     if (currentUser) {
  //       let questionCore = {
  //         id: Date.now().toString(),
  //         type : ques.type,
  //         subject: ques.subject,
  //         chapters: ques.chapters?.map((chapter: any) => {
  //           let topicArray = ques.topics?.map((topic : any) => topic.name);
  //           return {
  //             name: chapter.name,
  //             topics: topicArray?.length
  //               ? chapter.topics.filter((value: any) =>
  //                   topicArray.includes(value)
  //                 )
  //               : [],
  //           };
  //         }),
  //         difficulty: ques.difficulty || "unset",
  //         exams: ques.exams?.map((exam: any) => exam.name),
  //         sources: ques.sources?.map((source : any) => source.name),
  //         createdAt: new Date().toISOString(),
  //         modifiedAt: new Date().toISOString(),
  //         isProofRead: false,
  //         uploadedBy: {
  //           userType: currentUser?.userType,
  //           id: currentUser.id,
  //         },
  //       };

  //       // // console.log("questionCore :",{questionCore });

  //       switch (ques.type) {
  //         // allow fall through
  //         // eslint-disable-next-line no-fallthrough
  //         // @ts-ignore
  //         case "single":
  //         // @ts-ignore
  //         // eslint-disable-next-line no-fallthrough
  //         case "multiple":
  //           {
  //             const finalQuestion: IQuestionObjective = {
  //               ...questionCore,
  //               en: {
  //                 question: ques.en.question,
  //                 options: ques.en.options,
  //                 solution: ques.en.solution,
  //               },
  //               hi: {
  //                 question: ques.hi.question,
  //                 options: ques.hi.options,
  //                 solution: ques.hi.solution,
  //               },
  //               correctAnswers: ques.correctAnswers,
  //               type: ques.type,
  //             };
  //             // const fetchQuestion =  async () => {
  //             //   return await API_QUESTIONS().post(`/mcq/new`, finalQuestion);
  //             // };
  //             // console.log("OBJECTIVE", { finalQuestion }, "Before Validation");
  //             let res = "";
  //             // // console.log("haan ye chala")
  //             let dataValid = checkQuestionValidity(
  //               finalQuestion,
  //               setError,
  //               defaultErrorObject.objective
  //             );
  //             if (!dataValid.state) {
  //               message.error(dataValid?.message);
  //               return;
  //             }
  //             // console.log("OBJECTIVE", { finalQuestion }, "After Validation");
  //             if (dataValid?.state) {
  //                 let loading = message.loading("Creating Question...");
  //                 async function createNewQuestion() {
  //                   return await API_QUESTIONS().post(
  //                     `/mcq/new`,
  //                     finalQuestion
  //                   );
  //                 }
  //                 await createNewQuestion();
  //                 // const temp = Array(50)
  //                 //   .fill(null)
  //                 //   .map(() => createNewQuestion());
  //                 // await Promise.all(temp);
  //                 loading();
  //                 message.success("Question created successfully");
  //             }

  //             // console.log("haan bhai multi-> ",{finalQuestion});
  //           }
  //           break;
  //         case "integer":
  //           {
  //             const finalQuestion: IQuestionInteger = {
  //               ...questionCore,
  //               en: {
  //                 question: ques.en.question,
  //                 solution: ques.en.solution,
  //               },
  //               hi: {
  //                 question: ques.hi.question,
  //                 solution: ques.hi.solution,
  //               },
  //               correctAnswer: ques.correctAnswers ?? { from: "", to: "" },
  //             };
  //             // console.log("INTEGER", { finalQuestion }, "Before Validation");
  //             let dataValid = checkQuestionValidity(
  //               finalQuestion,
  //               setError,
  //               defaultErrorObject.integer
  //             );

  //             if (!dataValid.state) {
  //               message.error(dataValid?.message);
  //               return;
  //             }
  //             // console.log("INTEGER", { finalQuestion }, "After Validation");
  //             let res = "";

  //             if (dataValid.state) {
  //                 let loading = message.loading("Creating Question...");
  //                 // // console.log("Hello This is Test");
  //                 async function createNewIntegerQuestion() {
  //                   return await API_QUESTIONS().post(
  //                     `/numerical/new`,
  //                     finalQuestion
  //                   );
  //                 }
  //                 await createNewIntegerQuestion();
  //                 // const temp = Array(50)
  //                 //   .fill(null)
  //                 //   .map(() => createNewIntegerQuestion());
  //                 // await Promise.all(temp);
  //                 // const res = await API_QUESTIONS().post(
  //                 //   `/numerical/new`,
  //                 //   finalQuestion
  //                 // );
  //                 // // console.log({ res });
  //                 loading();
  //                 message.success("Question created successfully");
  //             }
  //             // console.log("haan bhai integer-> ",{finalQuestion});
              
  //           }
  //           break;
  //         case "paragraph":
  //           {
  //             const finalQuestion: IQuestionParagraph = {
  //               ...questionCore,
  //               questions: ques.questions,
  //               paragraph: ques.paragraph,
  //             };
  //             // console.log("PARAGRAPH", { finalQuestion }, "Before Validation");
  //             let dataValid = checkQuestionValidity(
  //               finalQuestion,
  //               setError,
  //               defaultErrorObject.paragraph
  //             );
  //             if (!dataValid.state) {
  //               message.error(dataValid?.message);
  //               return;
  //             }
  //             // console.log("PARAGRAPH", { finalQuestion }, "After Validation");
  //             if (dataValid.state) {
  //                 let loading = message.loading("Creating Question...");

  //                 const res = await API_QUESTIONS().post(
  //                   `/paragraph/new`,
  //                   finalQuestion
  //                 );
  //                 // console.log({ res });
  //                 loading();
  //                 message.success("Question created successfully");
  //                 // setIsSubmitting(false);
  //             }
  //             // console.log("haan bhai para-> ",{finalQuestion});
  //           }
  //           break;
  //         case "matrix":
  //           {
  //             const finalQuestion: IQuestionMatrix = {
  //               ...questionCore,
  //               correctAnswer: ques.correctAnswers,
  //               en: {
  //                 question: ques.en.question,
  //                 solution: ques.en.solution,
  //               },
  //               hi: {
  //                 question: ques.hi.question,
  //                 solution: ques.hi.solution,
  //               },
  //             };
  //             // console.log("MATRIX", { finalQuestion }, "Before Validation");
  //             let dataValid = checkQuestionValidity(
  //               finalQuestion,
  //               setError,
  //               defaultErrorObject.matrix
  //             );
  //             if (!dataValid.state) {
  //               message.error(dataValid?.message);
  //               return;
  //             }
  //             // console.log("MATRIX", { finalQuestion }, "After Validation");
  //             if (dataValid.state) {
  //                 let loading = message.loading("Creating Question...");
  //                 const res = await API_QUESTIONS().post(
  //                   `/matrix/new`,
  //                   finalQuestion
  //                 );
  //                 loading();
  //                 // console.log({ res, finalQuestion });
  //                 message.success("Question created successfully");
  //             }
  //             // console.log("haan bhai matrix-> ",{finalQuestion});
  //           }
  //           break;

  //         default:
  //           return;
  //       }
  //     }
  //   } catch (error) {
  //     message.success("ERR_CREATE_QUESTION" + error);
  //   }
  // }

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
    </MainLayout>
  );
};

export default BulkWord;
