import { useRef, useCallback, useEffect, useState } from "react";

const TOOLBAR = [
  { cmd: "bold", icon: "B", title: "Bold (Ctrl+B)", style: { fontWeight: 700 } },
  { cmd: "italic", icon: "I", title: "Italic (Ctrl+I)", style: { fontStyle: "italic" } },
  { cmd: "underline", icon: "U", title: "Underline (Ctrl+U)", style: { textDecoration: "underline" } },
  { cmd: "strikeThrough", icon: "S", title: "Strikethrough", style: { textDecoration: "line-through" } },
  { sep: true },
  { cmd: "insertUnorderedList", icon: "•", title: "Bullet list" },
  { cmd: "insertOrderedList", icon: "1.", title: "Numbered list" },
  { sep: true },
  { cmd: "indent", icon: "→", title: "Indent (Tab)" },
  { cmd: "outdent", icon: "←", title: "Outdent (Shift+Tab)" },
];

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);
  const internalRef = useRef(value || "");
  const [activeFormats, setActiveFormats] = useState(new Set());

  useEffect(() => {
    const nextValue = value || "";
    if (editorRef.current && editorRef.current.innerHTML !== nextValue) {
      editorRef.current.innerHTML = nextValue;
      internalRef.current = nextValue;
    }
  }, [value]);

  const syncState = useCallback(() => {
    const html = editorRef.current?.innerHTML || "";
    internalRef.current = html;
    onChange?.(html);
  }, [onChange]);

  const checkActiveFormats = useCallback(() => {
    const formats = new Set();
    if (document.queryCommandState("bold")) formats.add("bold");
    if (document.queryCommandState("italic")) formats.add("italic");
    if (document.queryCommandState("underline")) formats.add("underline");
    if (document.queryCommandState("strikeThrough")) formats.add("strikeThrough");
    if (document.queryCommandState("insertUnorderedList")) formats.add("insertUnorderedList");
    if (document.queryCommandState("insertOrderedList")) formats.add("insertOrderedList");
    setActiveFormats(formats);
  }, []);

  const exec = useCallback((cmd) => {
    document.execCommand(cmd, false, null);
    editorRef.current?.focus();
    syncState();
    checkActiveFormats();
  }, [syncState, checkActiveFormats]);

  const handleInput = useCallback(() => {
    syncState();
    checkActiveFormats();
  }, [syncState, checkActiveFormats]);

  const handleKeyUp = useCallback(() => {
    checkActiveFormats();
  }, [checkActiveFormats]);

  const handleMouseUp = useCallback(() => {
    checkActiveFormats();
  }, [checkActiveFormats]);

  const handleKeyDown = useCallback((e) => {
    // Tab for indent/outdent inside lists
    if (e.key === "Tab") {
      const inList =
        document.queryCommandState("insertUnorderedList") ||
        document.queryCommandState("insertOrderedList");
      if (inList) {
        e.preventDefault();
        document.execCommand(e.shiftKey ? "outdent" : "indent", false, null);
        syncState();
        return;
      }
    }

    // Auto-start bullet list: "* " at start of line
    if (e.key === " ") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        const text = node.textContent || "";
        const offset = range.startOffset;
        // Check if the character before cursor is "*" and it's at position 1
        if (offset === 1 && text.charAt(0) === "*") {
          e.preventDefault();
          // Remove the "*"
          node.textContent = text.substring(1);
          document.execCommand("insertUnorderedList", false, null);
          syncState();
          checkActiveFormats();
          return;
        }
      }
    }
  }, [syncState, checkActiveFormats]);

  const handlePaste = useCallback(() => {
    setTimeout(() => {
      syncState();
    }, 0);
  }, [syncState]);

  const isEmpty = !internalRef.current ||
    internalRef.current === "<br>" ||
    internalRef.current === "<div><br></div>";

  return (
    <div className="rich-editor-wrapper">
      <div className="rich-editor-toolbar">
        {TOOLBAR.map((btn, i) =>
          btn.sep ? (
            <span key={i} className="toolbar-sep" />
          ) : (
            <button
              key={btn.cmd}
              type="button"
              className={`toolbar-btn${activeFormats.has(btn.cmd) ? " toolbar-btn-active" : ""}`}
              title={btn.title}
              style={btn.style}
              onMouseDown={(e) => {
                e.preventDefault();
                exec(btn.cmd);
              }}
            >
              {btn.icon}
            </button>
          )
        )}
      </div>
      <div
        ref={editorRef}
        className="rich-editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        onPaste={handlePaste}
        style={{ minHeight: "120px" }}
      />
      {isEmpty && (
        <div className="rich-editor-placeholder">{placeholder}</div>
      )}
    </div>
  );
}
