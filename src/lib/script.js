const SUPPORTED_TAGS = new Set([
  "label",
  "jump",
  "chara_new",
  "chara_show",
  "chara_hide",
  "bg",
  "p",
  "r",
]);

const REQUIRED_ATTRS = {
  label: ["name"],
  jump: ["target"],
  chara_new: ["name", "storage"],
  chara_show: ["name"],
  chara_hide: ["name"],
  bg: ["storage"],
  p: [],
  r: [],
};

function unquote(value) {
  if (!value) {
    return "";
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function quoteIfNeeded(value) {
  if (value == null) {
    return "";
  }
  const stringValue = String(value);
  if (stringValue.length === 0) {
    return '""';
  }
  if (/\s/.test(stringValue) || /["'\]]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '\\"')}"`;
  }
  return stringValue;
}

function parseTag(lineText, lineNo) {
  const diagnostics = [];
  const content = lineText.slice(1, -1).trim();
  if (!content) {
    diagnostics.push({
      line: lineNo,
      message: "Empty tag is not allowed.",
    });
    return { command: null, diagnostics };
  }

  const firstSpace = content.search(/\s/);
  const tag = firstSpace === -1 ? content : content.slice(0, firstSpace);
  const attrsText = firstSpace === -1 ? "" : content.slice(firstSpace + 1);

  if (!SUPPORTED_TAGS.has(tag)) {
    diagnostics.push({
      line: lineNo,
      message: `Unsupported tag: ${tag}`,
    });
    return { command: null, diagnostics };
  }

  const attrs = {};
  const attrRegex =
    /([a-zA-Z_][a-zA-Z0-9_-]*)=("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^\s\]]+)/g;
  let lastIndex = 0;
  let matched;

  while ((matched = attrRegex.exec(attrsText)) !== null) {
    const between = attrsText.slice(lastIndex, matched.index);
    if (between.trim().length > 0) {
      diagnostics.push({
        line: lineNo,
        message: `Malformed attribute near "${between.trim()}".`,
      });
    }
    const key = matched[1];
    attrs[key] = unquote(matched[2]);
    lastIndex = attrRegex.lastIndex;
  }

  const tail = attrsText.slice(lastIndex).trim();
  if (tail.length > 0) {
    diagnostics.push({
      line: lineNo,
      message: `Malformed attribute near "${tail}".`,
    });
  }

  for (const key of REQUIRED_ATTRS[tag]) {
    if (!attrs[key]) {
      diagnostics.push({
        line: lineNo,
        message: `Missing required attribute "${key}" for [${tag}].`,
      });
    }
  }

  return {
    command: {
      type: "tag",
      tag,
      attrs,
      line: lineNo,
    },
    diagnostics,
  };
}

function isStandaloneTag(trimmed) {
  return trimmed.startsWith("[") && trimmed.endsWith("]");
}

function pushPendingText(ast, pending) {
  if (pending.lines.length === 0) {
    return;
  }
  ast.push({
    type: "text",
    text: ensureTextEndsWithPageBreak(pending.lines.join("\n")),
    speaker: pending.speaker || "",
    line: pending.startLine,
  });
  pending.lines = [];
  pending.startLine = 0;
}

function appendTextSegment(pending, segment, lineNo, currentSpeaker) {
  if (pending.startLine === 0) {
    pending.startLine = lineNo;
    pending.speaker = currentSpeaker || "";
  }
  pending.lines.push(segment);
}

function ensureTextEndsWithPageBreak(value) {
  const source = value == null ? "" : String(value);
  if (source.trim().length === 0) {
    return "[p]";
  }
  return /\[p\]\s*$/.test(source) ? source : `${source}[p]`;
}

export function parseScript(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const ast = [];
  const diagnostics = [];
  const pending = {
    lines: [],
    startLine: 0,
    speaker: "",
  };
  let currentSpeaker = "";

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (pending.lines.length > 0) {
        pending.lines.push("");
      }
      continue;
    }

    if (trimmed.startsWith("#")) {
      pushPendingText(ast, pending);
      const speakerName = trimmed.slice(1).trim();
      currentSpeaker = speakerName;
      ast.push({
        type: "speaker",
        name: speakerName,
        line: lineNo,
      });
      continue;
    }

    if (trimmed.startsWith("[")) {
      if (!isStandaloneTag(trimmed)) {
        diagnostics.push({
          line: lineNo,
          message: "Tag line must start with '[' and end with ']'.",
        });
        continue;
      }
      const parsed = parseTag(trimmed, lineNo);
      diagnostics.push(...parsed.diagnostics);
      if (parsed.command) {
        if (parsed.command.tag === "p") {
          appendTextSegment(pending, "[p]", lineNo, currentSpeaker);
          pushPendingText(ast, pending);
          continue;
        }
        if (parsed.command.tag === "r" && pending.lines.length > 0) {
          pending.lines.push("");
          continue;
        }
        pushPendingText(ast, pending);
        ast.push(parsed.command);
      }
      continue;
    }

    let rest = rawLine;
    let emittedSegment = false;
    while (rest.length > 0) {
      const pIndex = rest.indexOf("[p]");
      const rIndex = rest.indexOf("[r]");

      let nextIndex = -1;
      let nextToken = "";
      if (pIndex >= 0 && (rIndex < 0 || pIndex < rIndex)) {
        nextIndex = pIndex;
        nextToken = "[p]";
      } else if (rIndex >= 0) {
        nextIndex = rIndex;
        nextToken = "[r]";
      }

      if (nextIndex < 0) {
        appendTextSegment(pending, rest, lineNo, currentSpeaker);
        emittedSegment = true;
        break;
      }

      const segment = rest.slice(0, nextIndex);
      emittedSegment = true;

      if (nextToken === "[r]") {
        appendTextSegment(pending, segment, lineNo, currentSpeaker);
        pending.lines.push("");
      } else {
        appendTextSegment(pending, `${segment}[p]`, lineNo, currentSpeaker);
        pushPendingText(ast, pending);
      }

      rest = rest.slice(nextIndex + nextToken.length);
    }

    if (!emittedSegment) {
      appendTextSegment(pending, rawLine, lineNo, currentSpeaker);
    }
  }

  pushPendingText(ast, pending);

  const labelLines = new Map();
  for (const command of ast) {
    if (command.type !== "tag" || command.tag !== "label") {
      continue;
    }
    const name = command.attrs.name;
    if (labelLines.has(name)) {
      diagnostics.push({
        line: command.line,
        message: `Duplicate label "${name}" (first at line ${labelLines.get(name)}).`,
      });
      continue;
    }
    labelLines.set(name, command.line);
  }

  return { ast, diagnostics };
}

function serializeTag(command) {
  const attrs = Object.entries(command.attrs || {})
    .filter(([, value]) => value != null && String(value).length > 0)
    .map(([key, value]) => `${key}=${quoteIfNeeded(value)}`)
    .join(" ");
  if (!attrs) {
    return `[${command.tag}]`;
  }
  return `[${command.tag} ${attrs}]`;
}

export function serializeScript(ast) {
  const lines = [];
  for (const command of ast) {
    if (command.type === "speaker") {
      lines.push(`#${command.name || ""}`);
      continue;
    }
    if (command.type === "text") {
      lines.push(ensureTextEndsWithPageBreak(command.text ?? ""));
      continue;
    }
    lines.push(serializeTag(command));
  }
  return lines.join("\n");
}

export function astToScenes(ast) {
  const scenes = [];
  let current = null;

  function ensureScene() {
    if (!current) {
      current = {
        label: "start",
        commands: [],
      };
      scenes.push(current);
    }
  }

  for (const command of ast) {
    if (command.type === "tag" && command.tag === "label") {
      current = {
        label: command.attrs.name || `scene_${scenes.length + 1}`,
        commands: [],
      };
      scenes.push(current);
      continue;
    }
    ensureScene();
    current.commands.push({
      type: command.type,
      name: command.name,
      tag: command.tag,
      attrs: { ...(command.attrs || {}) },
      text: command.text,
      speaker: command.speaker,
    });
  }

  if (scenes.length === 0) {
    scenes.push({
      label: "start",
      commands: [],
    });
  }

  return scenes;
}

export function scenesToAst(scenes) {
  const ast = [];
  for (const scene of scenes) {
    ast.push({
      type: "tag",
      tag: "label",
      attrs: { name: scene.label || "start" },
      line: 0,
    });
    for (const command of scene.commands) {
      if (command.type === "speaker") {
        ast.push({
          type: "speaker",
          name: command.name || "",
          line: 0,
        });
        continue;
      }
      if (command.type === "text") {
        ast.push({
          type: "text",
          text: ensureTextEndsWithPageBreak(command.text || ""),
          speaker: command.speaker || "",
          line: 0,
        });
        continue;
      }
      ast.push({
        type: "tag",
        tag: command.tag,
        attrs: { ...(command.attrs || {}) },
        line: 0,
      });
    }
  }
  return ast;
}

export function createEmptyCommand(tag = "text") {
  if (tag === "speaker") {
    return { type: "speaker", name: "" };
  }
  if (tag === "text") {
    return { type: "text", text: "" };
  }
  if (tag === "p" || tag === "r") {
    return { type: "tag", tag, attrs: {} };
  }
  if (tag === "bg") {
    return { type: "tag", tag, attrs: { storage: "" } };
  }
  if (tag === "jump") {
    return { type: "tag", tag, attrs: { target: "" } };
  }
  if (tag === "chara_new") {
    return { type: "tag", tag, attrs: { name: "", storage: "" } };
  }
  return { type: "tag", tag, attrs: { name: "" } };
}
