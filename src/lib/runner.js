function buildLabelIndex(ast) {
  const labels = new Map();
  const normalize = (value) => {
    const source = value == null ? "" : String(value).trim();
    if (!source) {
      return "";
    }
    return source.startsWith("*") ? source : `*${source}`;
  };
  for (let i = 0; i < ast.length; i += 1) {
    const command = ast[i];
    if (command.type === "tag" && command.tag === "label" && command.attrs.name) {
      labels.set(normalize(command.attrs.name), i);
    }
  }
  return labels;
}

function cloneScenarioState(state) {
  return {
    background: state.background || "",
    speaker: state.speaker || "",
    characters: Object.fromEntries(
      Object.entries(state.characters || {}).map(([key, value]) => [
        key,
        {
          name: value?.name || key,
          storage: value?.storage || "",
          visible: Boolean(value?.visible),
        },
      ]),
    ),
  };
}

function snapshotState(state, message, cursor, extra = {}) {
  return {
    background: state.background,
    characters: Object.values(state.characters).filter((character) => character.visible),
    speaker: state.speaker || "",
    message,
    cursor: cursor || null,
    ...extra,
  };
}

export function runScenario({ ast, startAt = {}, initialState = null, initialLabel = "" }) {
  const labels = buildLabelIndex(ast);
  const normalizeLabel = (value) => {
    const source = value == null ? "" : String(value).trim();
    if (!source) {
      return "";
    }
    return source.startsWith("*") ? source : `*${source}`;
  };
  let pc = 0;

  if (startAt.label && startAt.label.trim().length > 0) {
    const labelIndex = labels.get(normalizeLabel(startAt.label));
    if (labelIndex == null) {
      throw new Error(`Start label "${startAt.label}" was not found.`);
    }
    pc = labelIndex;
  } else if (startAt.line != null && Number.isFinite(startAt.line)) {
    const lineTarget = Number(startAt.line);
    const indexByLine = ast.findIndex((command) => command.line >= lineTarget);
    if (indexByLine < 0) {
      throw new Error(`Start line ${lineTarget} is out of range.`);
    }
    pc = indexByLine;
  }

  const state = initialState
    ? cloneScenarioState(initialState)
    : {
        background: "",
        characters: {},
        speaker: "",
      };

  const frames = [];
  let textBuffer = "";
  let guard = 0;
  let currentLabel = initialLabel || "";
  let pendingLinks = [];

  const flushText = (force, astIndex = null) => {
    if (!force && textBuffer.length === 0) {
      return;
    }
    frames.push(
      snapshotState(state, textBuffer, {
        astIndex,
        label: currentLabel,
      }),
    );
    textBuffer = "";
  };

  const appendText = (value) => {
    if (!value) {
      return;
    }
    if (textBuffer.length > 0) {
      textBuffer += "\n";
    }
    textBuffer += value;
  };

  const consumeTextWithTokens = (value, astIndex) => {
    let rest = value || "";
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
        appendText(rest);
        return;
      }

      const segment = rest.slice(0, nextIndex);
      appendText(segment);

      if (nextToken === "[r]") {
        textBuffer += "\n";
      } else {
        flushText(true, astIndex);
      }

      rest = rest.slice(nextIndex + nextToken.length);
    }
  };

  while (pc < ast.length) {
    guard += 1;
    if (guard > 10000) {
      throw new Error("Scenario execution exceeded safety limit.");
    }

    const command = ast[pc];
    if (command.type === "speaker") {
      state.speaker = command.name || "";
      pc += 1;
      continue;
    }

    if (command.type === "text") {
      consumeTextWithTokens(command.text, pc);
      pc += 1;
      continue;
    }

    switch (command.tag) {
      case "label":
        currentLabel = normalizeLabel(command.attrs.name || "");
        pc += 1;
        break;
      case "jump": {
        const target = labels.get(normalizeLabel(command.attrs.target));
        if (target == null) {
          throw new Error(`Jump target "${command.attrs.target}" was not found.`);
        }
        pc = target;
        break;
      }
      case "link":
        pendingLinks.push({
          text: command.text || "",
          target: normalizeLabel(command.attrs?.target || ""),
          storage: command.attrs?.storage || "",
        });
        pc += 1;
        break;
      case "s":
        flushText(false, pc - 1);
        frames.push(
          snapshotState(
            state,
            "",
            {
              astIndex: pc,
              label: currentLabel,
            },
            {
              choices: pendingLinks,
              choiceRuntime: {
                state: cloneScenarioState(state),
                label: currentLabel,
              },
            },
          ),
        );
        return { frames, haltedOnChoice: pendingLinks.length > 0 };
      case "cm":
        textBuffer = "";
        pc += 1;
        break;
      case "choice":
        pendingLinks.push({
          text: command.attrs?.text || command.text || "",
          target: command.attrs?.target || "",
          storage: command.attrs?.storage || "",
        });
        pc += 1;
        break;
      case "chara_new":
        state.characters[command.attrs.name] = {
          name: command.attrs.name,
          storage: command.attrs.storage,
          visible: false,
        };
        pc += 1;
        break;
      case "chara_show": {
        const current =
          state.characters[command.attrs.name] ||
          {
            name: command.attrs.name,
            storage: "",
            visible: false,
          };
        state.characters[command.attrs.name] = {
          ...current,
          visible: true,
        };
        pc += 1;
        break;
      }
      case "chara_hide":
        if (state.characters[command.attrs.name]) {
          state.characters[command.attrs.name].visible = false;
        }
        pc += 1;
        break;
      case "bg":
        state.background = command.attrs.storage || "";
        pc += 1;
        break;
      case "r":
        textBuffer += "\n";
        pc += 1;
        break;
      case "p":
        flushText(true, pc);
        pc += 1;
        break;
      default:
        pc += 1;
        break;
    }
  }

  if (textBuffer.length > 0) {
    flushText(true, pc - 1);
  } else if (frames.length === 0) {
    frames.push(snapshotState(state, "", null));
  }

  return { frames };
}
