import React, { useEffect, useState } from "react";
// @ts-ignore
import docx2html from "docx2html";

function DocxReader(): JSX.Element {
  const [html, setHtml] = useState("");

  const readFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setHtml("");
    const file: File = e.target.files![0];
    const result = await docx2html(file);
    setHtml(result.toString());
  };

  useEffect(() => {
    console.log("html", html);
  }, [html]);

  return (
    <div>
      <input type="file" onChange={readFile} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export default DocxReader;
