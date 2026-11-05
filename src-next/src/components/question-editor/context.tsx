"use client";
/*
  What every section of the editor needs besides its own values: the language shown, read-only (deleted, or live
  lock), the picture upload, and "Convert with AI" for flagged images. `field` paths are the contract's
  LatexAssistTarget.field ("en.question", "en.options.D", "passage.en", "questions.2.en.solution", "matrix.listII.R.en").
*/
import * as React from "react";
import type { FieldImage, MathFieldProps } from "@/components/kit/math-field";
import type { Lang } from "./form";

export interface EditorCtx {
  lang: Lang;
  ro: boolean;
  upload?: MathFieldProps["onUploadImage"];
  convert: (field: string) => ((img: FieldImage) => void) | undefined;
  extra: (field: string) => ((img: FieldImage) => React.ReactNode) | undefined;
}

const Ctx = React.createContext<EditorCtx>({ lang: "en", ro: false, convert: () => undefined, extra: () => undefined });
export const EditorProvider = Ctx.Provider;
export const useEditor = () => React.useContext(Ctx);

/** MathField props for one field path (upload, convert, the AI draft card under a flagged image). */
export function useFieldProps(field: string): Pick<MathFieldProps, "onUploadImage" | "onConvertImage" | "imageExtra" | "disabled" | "lang"> {
  const c = useEditor();
  const lang = field.startsWith("hi.") || field.endsWith(".hi") || field.includes(".hi.") ? "hi" : "en";
  return { onUploadImage: c.upload, onConvertImage: c.convert(field), imageExtra: c.extra(field), disabled: c.ro, lang };
}
