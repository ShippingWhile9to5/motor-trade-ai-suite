"use client";

import { useState } from "react";
import { POLICY_TYPES } from "../lib/quote-tracker";

const OTHER_POLICY = "__other_policy__";

// The product a quote is for, as the commission return reports it. The listed
// types are most of the book, but anything can be typed in — so the field has
// to hold, and go on showing, a value that is not on the list.
export function PolicyTypeField({
  value,
  onSave,
  disabled,
  label,
  className,
}: {
  value: string;
  onSave: (next: string) => void;
  disabled?: boolean;
  label: string;
  className: string;
}) {
  const listed = (POLICY_TYPES as readonly string[]).includes(value);
  const [typing, setTyping] = useState(!listed && value !== "");
  const [text, setText] = useState(listed ? "" : value);
  // Only jump the cursor into the box when the broker asked for it, never
  // when a stored free-text value simply happens to be on screen.
  const [focusText, setFocusText] = useState(false);

  if (typing) {
    return (
      <input
        type="text"
        autoFocus={focusText}
        value={text}
        placeholder="e.g. Cyber"
        disabled={disabled}
        aria-label={label}
        className={className}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const next = text.trim();

          if (next === "") {
            setTyping(false);
            setFocusText(false);

            return;
          }

          if (next !== value) {
            onSave(next);
          }
        }}
      />
    );
  }

  return (
    <select
      value={listed ? value : ""}
      disabled={disabled}
      aria-label={label}
      className={className}
      onChange={(event) => {
        if (event.target.value === OTHER_POLICY) {
          setText("");
          setTyping(true);
          setFocusText(true);

          return;
        }

        onSave(event.target.value);
      }}
    >
      <option value="">Not set</option>
      {POLICY_TYPES.map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
      <option value={OTHER_POLICY}>+ Other cover</option>
    </select>
  );
}
