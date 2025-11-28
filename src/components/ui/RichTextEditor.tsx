import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Styles for the toolbar

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  // Editor modules (customize toolbar)
  const modules = {
    toolbar: [
      ["bold", "italic", "underline", "strike"], // Toggle buttons
      [{ list: "bullet" }, { list: "ordered" }], // Lists
    ],
  };

  // Editor formats (supported formats)
  const formats = [
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "ordered",
  ];

  return (
    <ReactQuill
      theme="snow" 
      value={value}
      onChange={onChange}
      modules={modules}
      formats={formats}
      placeholder={placeholder}
      className="rounded-md border border-input bg-background focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
};

export default RichTextEditor;