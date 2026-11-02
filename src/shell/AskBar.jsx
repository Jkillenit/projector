import { useState } from "react";
import { EXAMPLE_QUESTIONS } from "../features/guide/copy.js";

/** A text box and three example chips. Submitting opens the Ask screen with that question. */
export function AskBar({ onAsk }) {
  const [text, setText] = useState("");
  const submit = (value) => {
    const q = value.trim();
    if (q) onAsk(q);
  };
  return (
    <form
      className="fd-askbar"
      onSubmit={(e) => {
        e.preventDefault();
        submit(text);
      }}
    >
      <div className="fd-askbar-row">
        <input
          className="fd-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about tutoring, clubs, money, anything on campus"
          aria-label="Ask a question"
        />
        <button type="submit" className="fd-btn" disabled={!text.trim()}>
          Ask
        </button>
      </div>
      <div className="fd-chip-row">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button key={q} type="button" className="fd-chip" onClick={() => submit(q)}>
            {q}
          </button>
        ))}
      </div>
    </form>
  );
}
