import { createRef } from "react";
import { Button } from "primereact/button";
import { Editor } from "primereact/editor";
import { REPORT_NOTIFY_TEMPLATE_TOKENS } from "~/features/reports/report-notify-tokens";

export interface NotifyEmailBodyEditorCoreProps {
  value: string;
  onChange: (html: string) => void;
  maxLength: number;
  placeholder?: string;
}

/**
 * Editor WYSIWYG (Quill vía PrimeReact). Solo se importa en cliente.
 */
export default function NotifyEmailBodyEditorCore({
  value,
  onChange,
  maxLength,
  placeholder,
}: NotifyEmailBodyEditorCoreProps) {
  const editorRef = createRef<Editor>();

  const insertToken = (token: string) => {
    const q = editorRef.current?.getQuill();
    if (!q) return;
    const range = q.getSelection(true);
    const index = range ? range.index : Math.max(0, q.getLength() - 1);
    q.insertText(index, token, "user");
    q.setSelection(index + token.length, 0, "silent");
    q.focus();
  };

  return (
    <div className="notify-email-editor flex flex-col gap-2">
      <Editor
        ref={editorRef}
        value={value}
        onTextChange={(e) => {
          let html = e.htmlValue ?? "";
          if (html.length > maxLength) {
            html = html.slice(0, maxLength);
          }
          onChange(html);
        }}
        maxLength={maxLength}
        style={{ height: "220px" }}
        showHeader
        placeholder={placeholder}
        className="rounded-md border border-slate-300 dark:border-slate-600 [&_.ql-container]:rounded-b-md [&_.ql-toolbar]:rounded-t-md"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-600 dark:text-slate-400">Insertar:</span>
        {REPORT_NOTIFY_TEMPLATE_TOKENS.map((t) => (
          <Button
            key={t.token}
            type="button"
            label={t.label}
            size="small"
            outlined
            className="!py-0.5 !text-xs"
            onClick={() => insertToken(t.token)}
          />
        ))}
      </div>
    </div>
  );
}
