import { InboxOutlined } from "@mui/icons-material";
import { Upload, UploadProps } from "antd";
import axios from "axios";
import { useState, useEffect, useContext } from "react";
import { API_QUESTIONS } from "../../utils/api/config";
import { AuthContext } from "../../utils/auth/AuthContext";
import categorizeQuestionsByType from "./utils/categorizeQuestionsByType";
import extractDataFromTable from "./utils/extractDataFromTable";
import getParagraphObject from "./utils/getParagraphObject";
import getQuestionObjectByType from "./utils/getQuestionObjectByType";

const { Dragger } = Upload;

const DocxReader: React.FC<{
  setQuestions: any;
  setLoading: any;
}> = ({ setQuestions, setLoading }) => {
  const [html, setHtml] = useState("");
  const [tableData, setTableData] = useState<string[][][]>([]);

  const props: UploadProps = {
    name: "file",
    multiple: false,
    accept: ".docx",
    beforeUpload: (file: any) => {
      readFile({
        target: {
          files: [file],
        },
      } as any);
      return false;
    },
    onDrop(e: any) {
      console.log("Dropped files", e.dataTransfer.files);
    },
  };

  const { currentUser } = useContext(AuthContext);

  const readFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    const file = e.target.files?.[0];
    // console.log(file);
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    // const res = await axios.post(
    //   "http://localhost:8000/extract-html",
    //   formData
    // );
    const res = await API_QUESTIONS().post("/utils/parse-docx", formData);

    setHtml(res.data?.html);
  };

  // useEffect(() => {
  //   console.log({ html });
  // });

  // replace </p><p> subString with </p><br/><p> in the string
  const replaceP = (str: string) => {
    const regex = /<\/p><p>/g;
    return str.replace(regex, "</p><br/><p>");
  };

  useEffect(() => {
    if (html?.length) {
      let correctAnswers: string[] = [];
      let correctAnswerWithIndices: {
        [key: string]: string[];
      } = {};
      const parser = new DOMParser();
      const doc = parser.parseFromString(html.toString(), "text/html");
      const tables = doc.getElementsByTagName("table");
      const tableData: string[][][] = extractDataFromTable(tables);
      setTableData(tableData);
      const tableHeaders = tableData[0][0];
      let data = tableData.map((table) => {
        const tableRows = table.slice(1);
        const finalRows = tableRows.map((row) => {
          const finalRow: any = {};
          row.forEach((cell, index) => {
            finalRow[tableHeaders[index]] = cell;
          });
          return finalRow;
        });
        return finalRows;
      });

      const {
        singleQuestions,
        multipleQuestions,
        integerQuestions,
        paragraphQuestions,
      } = categorizeQuestionsByType(data[0]);

      // console.log({
      //   singleQuestions,
      //   multipleQuestions,
      //   integerQuestions,
      //   paragraphQuestions,
      // });

      const finalDataSMI: any = {
        single: [],
        multiple: [],
        integer: [],
      };

      [...singleQuestions, ...multipleQuestions, ...integerQuestions]?.forEach(
        (item: any, i) => {
          finalDataSMI[item?.type] = [
            ...finalDataSMI[item?.type],
            getQuestionObjectByType({
              item,
              i,
              currentUser,
              tableHeaders,
              correctAnswerWithIndices,
            }),
          ];
        }
      );
      console.log({ finalDataSMI });
      const finalDataPara = paragraphQuestions?.map((item, i) =>
        getParagraphObject({ item, i, currentUser, tableHeaders })
      );

      // console.log({ tableData, tableHeaders, finalData, data });
      setQuestions({
        ...finalDataSMI,
        paragraph: finalDataPara,
      });
      setLoading(false);
    }
  }, [html]);

  return (
    <div>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag file to this area to upload
        </p>
        <p className="ant-upload-hint">
          Supports single file upload at a time, only upload
          <strong> .docx</strong> files
        </p>
      </Dragger>{" "}
      {/* {tableData.map((table, index) => (
        <table key={index}>
          <tbody>
            {table.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ))} */}
    </div>
  );
};

export default DocxReader;
