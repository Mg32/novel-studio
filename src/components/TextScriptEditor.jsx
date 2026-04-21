import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Textarea } from "@chakra-ui/react";

const TextScriptEditor = forwardRef(function TextScriptEditor(
  { value, onCommit, isDark, fontFamily },
  ref,
) {
  const [draft, setDraft] = useState(value || "");
  const isFocusedRef = useRef(false);
  const committedRef = useRef(value || "");

  const commitNow = useCallback(
    (nextText) => {
      const normalized = nextText == null ? "" : String(nextText);
      if (normalized === committedRef.current) {
        return normalized;
      }
      committedRef.current = normalized;
      onCommit(normalized);
      return normalized;
    },
    [onCommit],
  );

  useImperativeHandle(
    ref,
    () => ({
      flush() {
        return commitNow(draft);
      },
      getValue() {
        return draft;
      },
    }),
    [commitNow, draft],
  );

  useEffect(() => {
    const external = value == null ? "" : String(value);
    if (external !== committedRef.current) {
      committedRef.current = external;
      if (!isFocusedRef.current) {
        setDraft(external);
      }
    }
  }, [value]);

  return (
    <Textarea
      size="sm"
      borderWidth="0"
      fontFamily={fontFamily}
      h="100%"
      minH="0"
      resize="none"
      overflow="auto"
      value={draft}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        commitNow(draft);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      bg={isDark ? "gray.800" : "white"}
      color={isDark ? "gray.100" : "gray.900"}
      _placeholder={{ color: isDark ? "gray.400" : "gray.500" }}
    />
  );
});

export default memo(TextScriptEditor);
