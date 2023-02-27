import { useState, useEffect, useContext } from "react";
import { API_QUESTIONS } from "../../utils/api";
import { AuthContext } from "../../utils/auth/AuthContext";

const DocxReader = () => {
  const [html, setHtml] = useState("");
  const [tableData, setTableData] = useState<string[][][]>([]);

  const { currentUser } = useContext(AuthContext);

  const readFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await API_QUESTIONS().post("/utils/parse-docx", formData);
    setHtml(res.data?.html);
  };

  useEffect(() => {
    if (html?.length) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html.toString(), "text/html");
      const tables = doc.getElementsByTagName("table");
      const tableData: string[][][] = [];
      for (let i = 0; i < tables.length; i++) {
        const rows = tables[i].rows;
        const tableRows: string[][] = [];
        for (let j = 0; j < rows.length; j++) {
          const cells = rows[j].cells;
          const rowData: string[] = [];
          for (let k = 0; k < cells.length; k++) {
            rowData.push(cells[k].innerText);
          }
          tableRows.push(rowData);
        }
        tableData.push(tableRows);
      }
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
      const finalData = data[0]?.map((item) => ({
        type: item.type,
        en: {
          question: item.question,
          options: tableHeaders

            ?.filter((key) => regex.test(key))
            ?.map((key) => ({
              id: new Date().getTime(),
              value: item[key],
            })),
        },
        hi: {
          question: item.question,
          options: item.options,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: {
          id: currentUser?.id,
          userType: currentUser?.userType,
        },
      }));
      console.log(tableData, tableHeaders, finalData, data);
    }
  }, [html]);

  return (
    <div>
      <input type="file" onChange={readFile} placeholder="Upload File" />
      {tableData.map((table, index) => (
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
      ))}
    </div>
  );
};

export default DocxReader;
