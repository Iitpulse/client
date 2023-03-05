import { InboxOutlined } from "@mui/icons-material";
import { Upload, UploadProps } from "antd";
import { useState, useEffect, useContext } from "react";
import { capitalizeFirstLetter } from "../../utils";
import { API_QUESTIONS } from "../../utils/api";
import { AuthContext } from "../../utils/auth/AuthContext";

const { Dragger } = Upload;

function checkAndReplaceSemicolon(value: string) {
  const regexSemicolon = /op\d+\s*;/g;
  let newValue = value;
  const matchWithSemicolon = regexSemicolon.test(newValue);
  let ops: string[] = [];
  if (matchWithSemicolon) {
    // split the text by semicolon and add it to correctAnswers
    // remove '<p>' and '</p>' from the text
    ops = newValue
      ?.replace(/<p>/g, "")
      .replace(/<\/p>/g, "")
      .split(";")
      ?.filter((op) => op.length > 0 && op.startsWith("op"))
      ?.map((op) => op.trim()?.toLowerCase());
    // replace the text having semicolon with ""
    // newValue. = "";
    newValue = newValue.replace(regexSemicolon, "");
  }
  return {
    value: newValue,
    extractedValues: ops,
  };
}

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
      console.log("Uploading file", file);
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
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await API_QUESTIONS().post("/utils/parse-docx", formData);
    setHtml(res.data?.html);
  };

  useEffect(() => {
    console.log({ html });
  });

  const removeParaTag = (str: string) => {
    if (str.startsWith("<p>") && str.endsWith("</p>")) {
      return str.slice(3, str.length - 4);
    }
    return str;
  };

  const replaceWithBR = (str: string) => {
    return str.replace(/<\/p><p>/g, "</p><br><p>");
  };

  useEffect(() => {
    if (html?.length) {
      let correctAnswers: string[] = [];
      let correctAnswerWithIndices: {
        [key: string]: string[];
      } = {};
      console.log({ html });
      const parser = new DOMParser();
      const doc = parser.parseFromString(html.toString(), "text/html");
      const tables = doc.getElementsByTagName("table");
      const tableData: string[][][] = [];
      for (let i = 0; i < tables.length; i++) {
        const rows = tables[i].rows;
        const imgs = tables[i].querySelectorAll("img");
        if (imgs?.length) {
          for (let j = 0; j < imgs.length; j++) {
            const img = imgs[j];
            img.setAttribute("style", "max-width:min(100%, 200px)");
            img.setAttribute(
              "src",
              String(
                img
                  .getAttribute("src")
                  ?.replace("jpeg", "jpg")
                  .replace("jpg", "png")
              )
            );
          }
        }

        const tableRows: string[][] = [];
        let type = {
          index: 0,
          isFound: false,
        };

        for (let j = 0; j < rows.length; j++) {
          const cells = rows[j].cells;
          const rowData: string[] = [];
          if (j === 0) {
            for (let k = 0; k < cells.length; k++) {
              if (!type.isFound && cells[k].innerText === "type") {
                type.index = k;
                type.isFound = true;
              }
              rowData.push(cells[k].innerText);
            }
          } else {
            for (let k = 0; k < cells.length; k++) {
              rowData.push(
                k === type.index ? cells[k].innerText : cells[k].innerHTML
              );
            }
          }

          tableRows.push(rowData);
        }
        tableData.push(tableRows);
      }
      console.log({ tableData });
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
      const regex = /op\d/;
      // regex to check if word ends with semicolon

      // const options = tableHeaders
      //   ?.filter((key) => regex.test(key))
      //   ?.map((key) => ({
      //     id: key,
      //     value: "",
      //   }));

      function handleOption({ value, extractedValues }: any, i: number) {
        if (extractedValues?.length) {
          correctAnswerWithIndices[i] = extractedValues;
        }
        return value;
      }

      function handleOptionByQuestionType(item: any, i: number) {
        let options = tableHeaders
          ?.filter((key) => regex.test(key))
          ?.map((key) => ({
            id: key,
            value: "",
          }));
        console.log({ options, item });
        switch (item.type) {
          case "single":
          case "multiple":
            return {
              options: options?.map((op) => ({
                ...op,
                value: item[op.id],
              })),
              solution: handleOption(
                checkAndReplaceSemicolon(item.solution),
                i
              ),
              correctAnswers: correctAnswerWithIndices[i],
            };
          case "integer":
            return {
              solution: handleOption(
                checkAndReplaceSemicolon(item.solution),
                i
              ),
              correctAnswer: { from: item.op1, to: item.op2 },
            };
        }
        return {};
      }

      const finalData = data[0]
        ?.filter((ques: any) => ques.question.length > 0)
        ?.map((item, i) => {
          const { solution, options, ...rest }: any =
            handleOptionByQuestionType(item, i);
          let newObj: any = {
            id: i,
            ...rest,
            type: item.type,
            subject: removeParaTag(item.subject),
            difficulty: capitalizeFirstLetter(
              removeParaTag(item.difficulty || "Not Decided")
            ),
            chapters: item.chapters
              ?.split(",")
              ?.map((chap: string) => removeParaTag(chap.trim()))
              ?.map((chap: string) => ({
                name: chap,
                topics: item.topics
                  ?.split(",")
                  ?.map((topic: string) => removeParaTag(topic.trim())),
              })),
            en: {
              question: item.question,
              solution,
            },
            hi: {
              question: item.question,
              solution,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            uploadedBy: {
              id: currentUser?.id,
              userType: currentUser?.userType,
            },
          };
          if (options) {
            newObj.en.options = options;
            newObj.hi.options = options;
          }
          return newObj;
        });

      console.log({ tableData, tableHeaders, finalData, data });
      setQuestions(finalData);
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
