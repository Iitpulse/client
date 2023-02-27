import React, { useEffect, useState } from "react";
// @ts-ignore
import docx2html from "docx2html";

function DocxReader() {
  const [tableData, setTableData] = useState<string[][][]>([]);

  const readFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const html = await docx2html(file as File);
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
          console.log(cells[k].innerText);
        }
        tableRows.push(rowData);
      }
      tableData.push(tableRows);
    }
    setTableData(tableData);
  };

  useEffect(() => {}, []);

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
}

export default DocxReader;
