import { useState, type ChangeEvent, type KeyboardEvent } from "react";

/**
 * A search box that searches when Enter is pressed, not on every keystroke. Emptying the box
 * shows everything again at once. Spread `inputProps` on the input and search with `term`.
 */
export function useSearchOnEnter(initial = "") {
  const [draft, setDraft] = useState(initial);
  const [term, setTerm] = useState(initial.trim());

  return {
    term,
    inputProps: {
      value: draft,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        setDraft(event.target.value);
        if (!event.target.value.trim()) setTerm("");
      },
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        // Not while an input method is still composing a letter.
        if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
        // Inside a form, Enter would also submit it.
        event.preventDefault();
        setTerm(draft.trim());
      },
    },
  };
}
