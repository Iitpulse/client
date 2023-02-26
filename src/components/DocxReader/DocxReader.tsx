import { useState, useEffect } from "react";
import { API_QUESTIONS } from "../../utils/api";

const DocxReader = () => {
  const [html, setHtml] = useState("");
  const [tableData, setTableData] = useState<string[][][]>([]);

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
    }
  }, [html]);

  return (
    <div>
      <input type="file" onChange={readFile} />
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
