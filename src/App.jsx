import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, Grid, Portal, Tabs, Text, Tooltip, useMediaQuery } from "@chakra-ui/react";
import { FiColumns, FiCopy, FiCrosshair, FiEdit3, FiExternalLink, FiGrid, FiMonitor, FiPlay, FiShare2, FiSquare, FiX } from "react-icons/fi";
import { astToScenes, parseScript, scenesToAst, serializeScript } from "./lib/script";
import { runScenario } from "./lib/runner";
import { decodeScenario, encodeScenario } from "./lib/share";
import { DEFAULT_SCRIPT, EDITOR_FONT, STORAGE_KEY } from "./constants/editor";
import AppSelect from "./components/AppSelect";
import TipIconButton from "./components/TipIconButton";
import LabelEditor from "./components/LabelEditor";
import StageView from "./components/StageView";
import TextScriptEditor from "./components/TextScriptEditor";

function buildAstIndexToGuiLocation(ast) {
  const map = new Map();
  let labelIndex = -1;
  let commandIndex = 0;
  for (let i = 0; i < ast.length; i += 1) {
    const command = ast[i];
    if (command.type === "tag" && command.tag === "label") {
      labelIndex += 1;
      commandIndex = 0;
      continue;
    }
    if (labelIndex < 0) {
      labelIndex = 0;
      commandIndex = 0;
    }
    map.set(i, { labelIndex, commandIndex });
    commandIndex += 1;
  }
  return map;
}

function buildLineToGuiLocation(ast) {
  const map = new Map();
  let labelIndex = -1;
  let commandIndex = 0;
  for (let i = 0; i < ast.length; i += 1) {
    const command = ast[i];
    if (command.type === "tag" && command.tag === "label") {
      labelIndex += 1;
      commandIndex = 0;
      continue;
    }
    if (labelIndex < 0) {
      labelIndex = 0;
      commandIndex = 0;
    }
    const lineNo = Number(command.line || 0);
    if (lineNo > 0 && !map.has(lineNo)) {
      map.set(lineNo, { labelIndex, commandIndex });
    }
    commandIndex += 1;
  }
  return map;
}

function buildCommandErrorMap(ast, diagnostics) {
  const lineMap = buildLineToGuiLocation(ast);
  const knownLines = [...lineMap.keys()].sort((a, b) => a - b);
  const result = {};

  for (const diagnostic of diagnostics) {
    const lineNo = Number(diagnostic.line || 0);
    if (lineNo <= 0) {
      continue;
    }
    let location = lineMap.get(lineNo);
    if (!location) {
      let nearest = null;
      for (let i = 0; i < knownLines.length; i += 1) {
        if (knownLines[i] > lineNo) {
          break;
        }
        nearest = knownLines[i];
      }
      if (nearest != null) {
        location = lineMap.get(nearest);
      }
    }
    if (!location) {
      continue;
    }

    if (!result[location.labelIndex]) {
      result[location.labelIndex] = {};
    }
    const current = result[location.labelIndex][location.commandIndex];
    const nextMessage = `${diagnostic.line}: ${diagnostic.message}`;
    result[location.labelIndex][location.commandIndex] = current
      ? `${current}\n${nextMessage}`
      : nextMessage;
  }

  return result;
}

function App() {
  const [isDark] = useMediaQuery("(prefers-color-scheme: dark)");
  const [ready, setReady] = useState(false);
  const [activeEditor, setActiveEditor] = useState("gui");
  const [activePanel, setActivePanel] = useState("editor");
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const [guiScenes, setGuiScenes] = useState([]);
  const [ast, setAst] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [isGuiDirty, setIsGuiDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [startLabel, setStartLabel] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [isStageExpanded, setIsStageExpanded] = useState(false);
  const [frames, setFrames] = useState([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [runError, setRunError] = useState("");
  const [jumpToGuiTarget, setJumpToGuiTarget] = useState(null);
  const toastTimerRef = useRef(null);
  const storageTimerRef = useRef(null);
  const textEditorRef = useRef(null);

  const iconButtonStyle = useMemo(
    () =>
      isDark
        ? {
            bg: "whiteAlpha.50",
            color: "gray.100",
            _hover: { bg: "whiteAlpha.200" },
            _active: { bg: "whiteAlpha.250" },
          }
        : {
            bg: "blackAlpha.50",
            color: "gray.800",
            _hover: { bg: "blackAlpha.100" },
            _active: { bg: "blackAlpha.200" },
          },
    [isDark],
  );
  const iconTabTriggerProps = useMemo(
    () => ({
      minW: "9",
      h: "9",
      px: "0",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: "1",
      rounded: "md",
      borderWidth: "0",
    }),
    [],
  );
  const runButtonProps = useMemo(
    () => ({
      bg: isDark ? "blue.700" : "blue.500",
      color: "white",
      _hover: { bg: isDark ? "blue.600" : "blue.600" },
    }),
    [isDark],
  );
  const subtleButtonProps = useMemo(
    () => ({
      bg: isDark ? "whiteAlpha.100" : "blackAlpha.100",
      color: isDark ? "gray.100" : "gray.800",
      _hover: { bg: isDark ? "whiteAlpha.200" : "blackAlpha.200" },
    }),
    [isDark],
  );

  const applyText = useCallback((nextText) => {
    const parsed = parseScript(nextText);
    const nextScenes = astToScenes(parsed.ast);
    setScriptText(nextText);
    setAst(parsed.ast);
    setGuiScenes(nextScenes);
    setDiagnostics(parsed.diagnostics);
    setIsGuiDirty(false);
    return parsed;
  }, []);

  const buildAstFromScenes = useCallback((sourceScenes = guiScenes) => scenesToAst(sourceScenes), [guiScenes]);

  const flushGuiToText = useCallback(
    (sourceScenes = guiScenes) => {
      const nextAst = scenesToAst(sourceScenes);
      const nextText = serializeScript(nextAst);
      setAst(nextAst);
      setScriptText(nextText);
      setIsGuiDirty(false);
      return { nextAst, nextText };
    },
    [guiScenes],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const url = new URL(window.location.href);
      const encoded = url.searchParams.get("s");
      let initialText = DEFAULT_SCRIPT;
      if (encoded) {
        try {
          initialText = await decodeScenario(encoded);
        } catch {
          initialText = DEFAULT_SCRIPT;
        }
      } else {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          initialText = saved;
        }
      }
      if (mounted) {
        applyText(initialText);
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applyText]);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    if (isGuiDirty) {
      return undefined;
    }
    if (storageTimerRef.current) {
      clearTimeout(storageTimerRef.current);
    }
    storageTimerRef.current = setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, scriptText);
      storageTimerRef.current = null;
    }, 260);
    return () => {
      if (storageTimerRef.current) {
        clearTimeout(storageTimerRef.current);
        storageTimerRef.current = null;
      }
    };
  }, [ready, scriptText, isGuiDirty]);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    const handleBeforeUnload = () => {
      const draftText = textEditorRef.current?.getValue?.();
      const textForStorage = isGuiDirty
        ? serializeScript(scenesToAst(guiScenes))
        : typeof draftText === "string"
          ? draftText
          : scriptText;
      window.localStorage.setItem(STORAGE_KEY, textForStorage);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [ready, isGuiDirty, scriptText, guiScenes]);

  useEffect(() => {
    document.documentElement.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.background = isDark ? "#030712" : "#f9fafb";
    const root = document.getElementById("root");
    if (root) {
      root.style.height = "100%";
      root.style.margin = "0";
      root.style.overflow = "hidden";
    }
  }, [isDark]);

  const scenes = useMemo(() => (activeEditor === "gui" ? guiScenes : []), [guiScenes, activeEditor]);
  const astIndexToGuiLocation = useMemo(() => buildAstIndexToGuiLocation(ast), [ast]);
  const commandErrorMap = useMemo(
    () => (activeEditor === "gui" && !isGuiDirty ? buildCommandErrorMap(ast, diagnostics) : {}),
    [ast, diagnostics, activeEditor, isGuiDirty],
  );
  const currentFrame = frames[frameIndex] || null;
  const labels = useMemo(() => {
    const set = new Set();
    if (isGuiDirty) {
      for (const scene of guiScenes) {
        if (scene.label) {
          set.add(scene.label);
        }
      }
      return [...set];
    }
    for (const command of ast) {
      if (command.type === "tag" && command.tag === "label" && command.attrs?.name) {
        set.add(command.attrs.name);
      }
    }
    return [...set];
  }, [ast, guiScenes, isGuiDirty]);
  const characterNames = useMemo(() => {
    const set = new Set();
    if (isGuiDirty) {
      for (const scene of guiScenes) {
        for (const command of scene.commands) {
          if (command.type === "tag" && command.tag === "chara_new" && command.attrs?.name) {
            set.add(command.attrs.name);
          }
        }
      }
      return [...set];
    }
    if (activeEditor !== "gui") {
      return [];
    }
    for (const command of ast) {
      if (command.type === "tag" && command.tag === "chara_new" && command.attrs?.name) {
        set.add(command.attrs.name);
      }
    }
    return [...set];
  }, [ast, guiScenes, activeEditor, isGuiDirty]);
  const labelSelectOptions = useMemo(
    () => [{ label: "label", value: "" }, ...labels.map((label) => ({ label, value: label }))],
    [labels],
  );
  const aspectSelectOptions = useMemo(
    () => [
      { label: "16:9", value: "16:9" },
      { label: "9:16", value: "9:16" },
    ],
    [],
  );

  const updateByScenes = useCallback((nextScenes) => {
    setGuiScenes(nextScenes);
    setIsGuiDirty(true);
    setDiagnostics([]);
  }, []);

  const runPreview = useCallback(() => {
    const flushedText =
      activeEditor === "text"
        ? textEditorRef.current?.flush?.()
        : null;
    const parsedFromText =
      typeof flushedText === "string" && flushedText !== scriptText
        ? applyText(flushedText)
        : null;

    let previewAst = isGuiDirty ? buildAstFromScenes(guiScenes) : parsedFromText?.ast ?? ast;
    let currentDiagnostics = parsedFromText?.diagnostics ?? diagnostics;
    if (isGuiDirty) {
      const previewText = serializeScript(previewAst);
      const parsedFromGui = parseScript(previewText);
      previewAst = parsedFromGui.ast;
      currentDiagnostics = parsedFromGui.diagnostics;
    }
    if (currentDiagnostics.length > 0) {
      setRunError("Fix parser errors.");
      return;
    }
    try {
      const result = runScenario({
        ast: previewAst,
        startAt: { label: startLabel.trim() || undefined },
      });
      setFrames(result.frames);
      setFrameIndex(0);
      setRunError("");
    } catch (error) {
      setFrames([]);
      setFrameIndex(0);
      setRunError(error.message);
    }
  }, [
    activeEditor,
    scriptText,
    applyText,
    isGuiDirty,
    buildAstFromScenes,
    guiScenes,
    ast,
    diagnostics,
    startLabel,
  ]);

  const stopPreview = useCallback(() => {
    setFrames([]);
    setFrameIndex(0);
    setRunError("");
  }, []);

  const copyScript = useCallback(async () => {
    try {
      let text = isGuiDirty ? flushGuiToText(guiScenes).nextText : scriptText;
      if (activeEditor === "text") {
        const flushed = textEditorRef.current?.flush?.();
        if (typeof flushed === "string") {
          text = flushed;
          if (flushed !== scriptText) {
            applyText(flushed);
          }
        }
      }
      await navigator.clipboard.writeText(text);
      setStatusMessage("Copied");
    } catch {
      setStatusMessage("Copy failed");
    }
  }, [activeEditor, applyText, flushGuiToText, guiScenes, isGuiDirty, scriptText]);

  const shareByUrl = useCallback(async () => {
    try {
      let text = isGuiDirty ? flushGuiToText(guiScenes).nextText : scriptText;
      if (activeEditor === "text") {
        const flushed = textEditorRef.current?.flush?.();
        if (typeof flushed === "string") {
          text = flushed;
          if (flushed !== scriptText) {
            applyText(flushed);
          }
        }
      }
      const encoded = await encodeScenario(text);
      const url = new URL(window.location.href);
      url.searchParams.set("s", encoded);
      window.history.replaceState({}, "", url);
      await navigator.clipboard.writeText(url.toString());
      setStatusMessage("URL copied");
    } catch {
      setStatusMessage("Share failed");
    }
  }, [activeEditor, applyText, flushGuiToText, guiScenes, isGuiDirty, scriptText]);

  const handleEditorTabChange = useCallback(
    (detail) => {
      const nextEditor = detail.value;
      if (nextEditor === "text" && isGuiDirty) {
        flushGuiToText(guiScenes);
      }
      if (nextEditor === "gui" && activeEditor === "text") {
        const flushed = textEditorRef.current?.flush?.();
        if (typeof flushed === "string" && flushed !== scriptText) {
          applyText(flushed);
        }
      }
      setActiveEditor(nextEditor);
    },
    [guiScenes, isGuiDirty, flushGuiToText, activeEditor, scriptText, applyText],
  );

  const advanceFrame = useCallback(() => {
    setFrameIndex((index) => Math.min(index + 1, Math.max(frames.length - 1, 0)));
  }, [frames.length]);

  const handleStageTap = useCallback(() => {
    if (!currentFrame) {
      runPreview();
      return;
    }
    if (frameIndex >= frames.length - 1) {
      stopPreview();
      return;
    }
    advanceFrame();
  }, [currentFrame, frameIndex, frames.length, runPreview, stopPreview, advanceFrame]);

  const jumpToCurrentGui = useCallback(() => {
    const astIndex = currentFrame?.cursor?.astIndex;
    if (astIndex == null) {
      return;
    }
    const indexMap = isGuiDirty
      ? buildAstIndexToGuiLocation(buildAstFromScenes(guiScenes))
      : astIndexToGuiLocation;
    const location = indexMap.get(astIndex);
    if (!location) {
      return;
    }
    setActivePanel("editor");
    setActiveEditor("gui");
    setJumpToGuiTarget({
      ...location,
      nonce: Date.now(),
    });
  }, [currentFrame, isGuiDirty, buildAstFromScenes, guiScenes, astIndexToGuiLocation]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setStatusMessage("");
      toastTimerRef.current = null;
    }, 1400);
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [statusMessage]);

  if (!ready) {
    return <Box p="3">Loading...</Box>;
  }

  return (
    <Box
      p="3"
      position="fixed"
      inset="0"
      display="flex"
      flexDirection="column"
      minH="0"
      overflow="hidden"
      boxSizing="border-box"
      bg={isDark ? "gray.950" : "gray.50"}
      color={isDark ? "gray.100" : "gray.900"}
    >
      <Flex mb="2" gap="2" align="center" justify="flex-start" wrap="wrap" display={{ base: "flex", lg: "none" }}>
        <Tabs.Root
          value={activePanel}
          onValueChange={(detail) => setActivePanel(detail.value)}
          variant="plain"
          size="sm"
          display={{ base: "block", lg: "none" }}
        >
            <Tabs.List bg="transparent" p="0" gap="1" alignItems="center">
              <Tooltip.Root openDelay={180} closeDelay={70} positioning={{ placement: "top" }}>
                <Tooltip.Trigger asChild>
                  <Tabs.Trigger
                    value="editor"
                    {...iconTabTriggerProps}
                    color={isDark ? "gray.200" : "gray.700"}
                    bg={activePanel === "editor" ? (isDark ? "whiteAlpha.200" : "blackAlpha.100") : "transparent"}
                  >
                    <FiEdit3 />
                  </Tabs.Trigger>
                </Tooltip.Trigger>
                <Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Content zIndex="tooltip">Editor</Tooltip.Content>
                  </Tooltip.Positioner>
                </Portal>
              </Tooltip.Root>
              <Tooltip.Root openDelay={180} closeDelay={70} positioning={{ placement: "top" }}>
                <Tooltip.Trigger asChild>
                  <Tabs.Trigger
                    value="preview"
                    {...iconTabTriggerProps}
                    color={isDark ? "gray.200" : "gray.700"}
                    bg={activePanel === "preview" ? (isDark ? "whiteAlpha.200" : "blackAlpha.100") : "transparent"}
                  >
                    <FiMonitor />
                  </Tabs.Trigger>
                </Tooltip.Trigger>
                <Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Content zIndex="tooltip">Preview</Tooltip.Content>
                  </Tooltip.Positioner>
                </Portal>
              </Tooltip.Root>
            </Tabs.List>
          </Tabs.Root>
      </Flex>

      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="3" flex="1" minH="0" overflow="hidden">
        <Box
          display={{ base: activePanel === "preview" ? "block" : "none", lg: "block" }}
          rounded="md"
          p="3"
          h="100%"
          minH="0"
          overflow="hidden"
          bg={isDark ? "gray.900" : "white"}
        >
          <Flex direction="column" h="100%" minH="0" overflow="hidden">
            <Grid templateColumns="repeat(2, minmax(0,1fr))" gap="2" mb="2">
              <AppSelect
                value={startLabel}
                onChange={setStartLabel}
                options={labelSelectOptions}
                isDark={isDark}
                placeholder="label"
              />
              <AppSelect
                value={aspect}
                onChange={setAspect}
                options={aspectSelectOptions}
                isDark={isDark}
              />
            </Grid>
            <Flex gap="1" mb="2">
              <TipIconButton
                label="Run"
                size="sm"
                {...runButtonProps}
                onClick={runPreview}
              >
                <FiPlay />
              </TipIconButton>
              <TipIconButton
                label="Stop"
                size="sm"
                {...subtleButtonProps}
                onClick={stopPreview}
              >
                <FiSquare />
              </TipIconButton>
              <TipIconButton
                label="Jump to GUI"
                size="sm"
                {...subtleButtonProps}
                onClick={jumpToCurrentGui}
                isDisabled={currentFrame?.cursor?.astIndex == null}
              >
                <FiCrosshair />
              </TipIconButton>
              <TipIconButton label="Expand" size="sm" ml="auto" {...iconButtonStyle} onClick={() => setIsStageExpanded(true)}>
                <FiExternalLink />
              </TipIconButton>
            </Flex>

            {runError && (
              <Text mb="2" color="red.500" fontSize="xs">
                {runError}
              </Text>
            )}

            <Box flex="1" minH="0" overflow="hidden">
              <StageView
                frame={currentFrame}
                aspect={aspect}
                isDark={isDark}
                canAdvance={frameIndex < frames.length - 1}
                onAdvance={handleStageTap}
                maxHeight="100%"
                emptyMessage="Run preview."
              />
            </Box>
          </Flex>
        </Box>

        <Box
          display={{ base: activePanel === "editor" ? "block" : "none", lg: "block" }}
          rounded="md"
          p="3"
          h="100%"
          minH="0"
          overflow="hidden"
          bg={isDark ? "gray.900" : "white"}
        >
          <Flex direction="column" h="100%" minH="0" overflow="hidden">
            <Flex mb="2" justify="space-between" align="center">
              <Tabs.Root value={activeEditor} onValueChange={handleEditorTabChange} variant="plain" size="sm">
                <Tabs.List bg="transparent" p="0" gap="1" alignItems="center">
                  <Tooltip.Root openDelay={180} closeDelay={70} positioning={{ placement: "top" }}>
                    <Tooltip.Trigger asChild>
                      <Tabs.Trigger
                        value="gui"
                        {...iconTabTriggerProps}
                        color={isDark ? "gray.200" : "gray.700"}
                        bg={activeEditor === "gui" ? (isDark ? "whiteAlpha.200" : "blackAlpha.100") : "transparent"}
                      >
                        <FiGrid />
                      </Tabs.Trigger>
                    </Tooltip.Trigger>
                    <Portal>
                      <Tooltip.Positioner>
                        <Tooltip.Content zIndex="tooltip">GUI</Tooltip.Content>
                      </Tooltip.Positioner>
                    </Portal>
                  </Tooltip.Root>
                  <Tooltip.Root openDelay={180} closeDelay={70} positioning={{ placement: "top" }}>
                    <Tooltip.Trigger asChild>
                      <Tabs.Trigger
                        value="text"
                        {...iconTabTriggerProps}
                        color={isDark ? "gray.200" : "gray.700"}
                        bg={activeEditor === "text" ? (isDark ? "whiteAlpha.200" : "blackAlpha.100") : "transparent"}
                      >
                        <FiColumns />
                      </Tabs.Trigger>
                    </Tooltip.Trigger>
                    <Portal>
                      <Tooltip.Positioner>
                        <Tooltip.Content zIndex="tooltip">Text</Tooltip.Content>
                      </Tooltip.Positioner>
                    </Portal>
                  </Tooltip.Root>
                </Tabs.List>
              </Tabs.Root>
              <Flex gap="1" align="center">
                <TipIconButton label="Copy share URL" size="sm" {...iconButtonStyle} onClick={shareByUrl}>
                  <FiShare2 />
                </TipIconButton>
                <TipIconButton label="Copy script" size="sm" {...iconButtonStyle} onClick={copyScript}>
                  <FiCopy />
                </TipIconButton>
              </Flex>
            </Flex>

            <Box flex="1" minH="0" overflow={activeEditor === "gui" ? "auto" : "hidden"}>
              {activeEditor === "gui" ? (
                <LabelEditor
                  scenes={scenes}
                  onChange={updateByScenes}
                  isDark={isDark}
                  iconButtonStyle={iconButtonStyle}
                  jumpTo={jumpToGuiTarget}
                  commandErrorMap={commandErrorMap}
                  characterNameOptions={characterNames}
                />
              ) : (
                <TextScriptEditor
                  ref={textEditorRef}
                  value={scriptText}
                  onCommit={applyText}
                  isDark={isDark}
                  fontFamily={EDITOR_FONT}
                />
              )}

              {activeEditor === "text" && diagnostics.length > 0 && (
                <Box mt="2" pl="4">
                  {diagnostics.map((diagnostic, index) => (
                    <Text key={`${diagnostic.line}-${index}`} color="red.500" fontSize="xs">
                      {diagnostic.line}: {diagnostic.message}
                    </Text>
                  ))}
                </Box>
              )}
            </Box>
          </Flex>
        </Box>
      </Grid>

      {statusMessage && (
        <Box
          position="fixed"
          bottom="4"
          left="50%"
          transform="translateX(-50%)"
          px="3"
          py="1.5"
          rounded="md"
          bg={isDark ? "whiteAlpha.200" : "blackAlpha.700"}
          color={isDark ? "gray.100" : "white"}
          pointerEvents="none"
          zIndex="60"
        >
          <Text fontSize="xs">{statusMessage}</Text>
        </Box>
      )}

      {isStageExpanded && (
        <Box position="fixed" inset="0" zIndex="40" bg="blackAlpha.700" p="3">
          <Box bg={isDark ? "gray.900" : "white"} rounded="md" p="2" h="100%">
            <Flex mb="2" justify="space-between" gap="2">
              <Box w="120px">
                <AppSelect
                  value={aspect}
                  onChange={setAspect}
                  options={aspectSelectOptions}
                  isDark={isDark}
                />
              </Box>
              <TipIconButton label="Close" size="sm" {...iconButtonStyle} onClick={() => setIsStageExpanded(false)}>
                <FiX />
              </TipIconButton>
            </Flex>
            <StageView
              frame={currentFrame}
              aspect={aspect}
              isDark={isDark}
              canAdvance={frameIndex < frames.length - 1}
              onAdvance={handleStageTap}
              maxHeight="calc(100dvh - 96px)"
              emptyMessage="Run preview."
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default App;
