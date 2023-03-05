import { InboxOutlined } from "@mui/icons-material";
import { Upload, UploadProps } from "antd";
import { useState, useEffect, useContext } from "react";
import { capitalizeFirstLetter } from "../../utils";
import { API_QUESTIONS } from "../../utils/api";
import { AuthContext } from "../../utils/auth/AuthContext";

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
          } else
            for (let k = 0; k < cells.length; k++) {
              rowData.push(
                k === type.index ? cells[k].innerText : cells[k].innerHTML
              );
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
      const regexSemicolon = /.*;$/;
      console.log({ secret: data[0] });
      const finalData = data[0]?.map((item) => ({
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
          options: tableHeaders
            ?.filter((key) => regex.test(key))
            ?.map((key) => ({
              id: new Date().getTime(),
              value: item[key],
            })),
          solution: item.solution,
        },
        hi: {
          question: item.question,
          options: tableHeaders
            ?.filter((key) => regex.test(key))
            ?.map((key) => ({
              id: new Date().getTime(),
              value: item[key],
            })),
          solution: item.solution,
        },
        //remove the word with semicolon using the regex
        // extract the word containing semicolon
        // correctAnswers: [item.solution?.match(regexSemicolon)?.[0]],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadedBy: {
          id: currentUser?.id,
          userType: currentUser?.userType,
        },
      }));
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
