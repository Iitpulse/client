export default function extractDataFromTable(
  tables: HTMLCollectionOf<HTMLTableElement>
): string[][][] {
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
          rowData.push(cells[k].innerText?.trim());
        }
      } else {
        for (let k = 0; k < cells.length; k++) {
          rowData.push(
            k === type.index
              ? cells[k].innerText?.trim()
              : cells[k].innerHTML?.trim()
          );
        }
      }

      tableRows.push(rowData);
    }
    tableData.push(tableRows);
  }

  return tableData;
}
