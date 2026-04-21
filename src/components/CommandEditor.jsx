import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, Grid, Input, Menu, Portal, Text, Textarea } from "@chakra-ui/react";
import {
  FiChevronRight,
  FiChevronsRight,
  FiEye,
  FiEyeOff,
  FiImage,
  FiMoreVertical,
  FiMove,
  FiUser,
  FiType,
  FiUserPlus,
} from "react-icons/fi";
import AppSelect from "./AppSelect";
import TipIconButton from "./TipIconButton";
import {
  BG_TEMPLATE_OPTIONS,
  CHARA_TEMPLATE_OPTIONS,
  COMMAND_OPTIONS,
  EDITOR_FONT,
} from "../constants/editor";
import { createEmptyCommand } from "../lib/script";

function EditorInput(props) {
  return <Input size="sm" borderWidth="0" {...props} />;
}

function AutoResizeTextarea({ value, onChange, minRows = 2, ...props }) {
  const rows = useMemo(() => {
    const text = value == null ? "" : String(value);
    const lineCount = text.split("\n").length;
    return Math.max(minRows, lineCount);
  }, [value, minRows]);

  return (
    <Textarea
      size="sm"
      borderWidth="0"
      resize="none"
      overflow="auto"
      rows={rows}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

const ImagePreview = memo(function ImagePreview({ src, alt, isDark, size = "68px" }) {
  const [failedSrc, setFailedSrc] = useState("");
  const isFailed = Boolean(src) && failedSrc === src;

  return (
    <Box
      rounded="md"
      bg={isDark ? "gray.800" : "gray.100"}
      w={size}
      h={size}
      minW={size}
      minH={size}
      display="flex"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      {src && !isFailed ? (
        <Box
          as="img"
          src={src}
          alt={alt}
          onError={() => setFailedSrc(src)}
          maxW="100%"
          maxH="100%"
          objectFit="contain"
        />
      ) : (
        <Text fontSize="10px" color={isDark ? "gray.400" : "gray.500"}>
          no img
        </Text>
      )}
    </Box>
  );
});

function createCommandForType(nextValue) {
  if (nextValue === "speaker") {
    return { type: "speaker", name: "name" };
  }
  if (nextValue === "text") {
    return { type: "text", text: "new text" };
  }
  return createEmptyCommand(nextValue);
}

const commandTypeOptions = [
  { label: "speaker", value: "speaker" },
  { label: "text", value: "text" },
  { label: "bg", value: "bg" },
  { label: "jump", value: "jump" },
  { label: "chara_new", value: "chara_new" },
  { label: "chara_show", value: "chara_show" },
  { label: "chara_hide", value: "chara_hide" },
  { label: "r", value: "r" },
];

function toGuiTextValue(value) {
  const source = value == null ? "" : String(value);
  return source.replace(/\[p\]\s*$/, "");
}

const commandTypeIconMap = {
  speaker: FiUser,
  text: FiType,
  bg: FiImage,
  jump: FiChevronRight,
  chara_new: FiUserPlus,
  chara_show: FiEye,
  chara_hide: FiEyeOff,
  p: FiChevronsRight,
  r: FiChevronsRight,
};

function buildHostedUrl(path) {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
}

function createTemplateOptions(baseOptions) {
  return [
    { label: "template", value: "" },
    ...baseOptions.map((item) => ({
      label: item.label,
      value: buildHostedUrl(item.path),
    })),
  ];
}

const bgTemplateOptions = createTemplateOptions(BG_TEMPLATE_OPTIONS);
const charaTemplateOptions = createTemplateOptions(CHARA_TEMPLATE_OPTIONS);

const CommandEditor = memo(function CommandEditor({
  command,
  onChange,
  onDelete,
  onAddAfter,
  errorMessage,
  characterNameOptions,
  isDark,
  iconButtonStyle,
  dragHandleProps,
}) {
  const currentType =
    command.type === "text" ? "text" : command.type === "speaker" ? "speaker" : command.tag;
  const TypeIcon = commandTypeIconMap[currentType] ?? FiType;
  const textCommitTimerRef = useRef(null);
  const isTextEditingRef = useRef(false);
  const latestCommandRef = useRef(command);

  const setAttr = (key, value) => {
    onChange({ ...command, attrs: { ...(command.attrs || {}), [key]: value } });
  };
  const charaNameSelectOptions = useMemo(
    () => [{ label: "name", value: "" }, ...characterNameOptions.map((name) => ({ label: name, value: name }))],
    [characterNameOptions],
  );
  const currentCharaName = command.attrs?.name || "";
  const guiText = toGuiTextValue(command.text || "");
  const [textDraft, setTextDraft] = useState(guiText);

  useEffect(() => {
    latestCommandRef.current = command;
  }, [command]);

  useEffect(() => {
    if (currentType !== "text") {
      return;
    }
    if (!isTextEditingRef.current) {
      setTextDraft(guiText);
    }
  }, [currentType, guiText]);

  const commitText = useCallback(
    (nextText) => {
      onChange({ ...latestCommandRef.current, text: nextText });
    },
    [onChange],
  );

  useEffect(
    () => () => {
      if (textCommitTimerRef.current) {
        clearTimeout(textCommitTimerRef.current);
        textCommitTimerRef.current = null;
      }
    },
    [],
  );

  return (
    <Box p="0">
      <Flex gap="1.5" align="center" mb="1.5">
        <Box
          w="7"
          h="7"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          color={isDark ? "gray.200" : "gray.700"}
        >
          <TypeIcon />
        </Box>
        <Box flex="1">
          <AppSelect
            value={currentType}
            onChange={(nextValue) => onChange(createCommandForType(nextValue))}
            options={commandTypeOptions.filter((option) => COMMAND_OPTIONS.includes(option.value))}
            isDark={isDark}
            fontFamily={EDITOR_FONT}
          />
        </Box>
        <TipIconButton label="Drag" size="xs" cursor="grab" {...iconButtonStyle} {...dragHandleProps}>
          <FiMove />
        </TipIconButton>
        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Menu.Trigger asChild>
            <Box>
              <TipIconButton label="Menu" size="xs" {...iconButtonStyle}>
                <FiMoreVertical />
              </TipIconButton>
            </Box>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="add-after" onSelect={onAddAfter}>
                  Add command below
                </Menu.Item>
                <Menu.Item value="delete" color="red.500" onSelect={onDelete}>
                  Delete command
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Flex>

      <Box ml="34px">
        {command.type === "speaker" && (
          <EditorInput
            bg={isDark ? "gray.800" : "white"}
            color={isDark ? "gray.100" : "gray.900"}
            fontFamily={EDITOR_FONT}
            value={command.name || ""}
            placeholder="speaker"
            onChange={(event) => onChange({ ...command, name: event.target.value })}
          />
        )}

        {command.type === "text" && (
          <AutoResizeTextarea
            minRows={2}
            bg={isDark ? "gray.800" : "white"}
            color={isDark ? "gray.100" : "gray.900"}
            fontFamily={EDITOR_FONT}
            value={textDraft}
            placeholder="text"
            onFocus={() => {
              isTextEditingRef.current = true;
            }}
            onBlur={() => {
              isTextEditingRef.current = false;
              if (textCommitTimerRef.current) {
                clearTimeout(textCommitTimerRef.current);
                textCommitTimerRef.current = null;
              }
              commitText(textDraft);
            }}
            onChange={(event) => {
              const nextText = event.target.value;
              setTextDraft(nextText);
              if (textCommitTimerRef.current) {
                clearTimeout(textCommitTimerRef.current);
              }
              textCommitTimerRef.current = setTimeout(() => {
                commitText(nextText);
                textCommitTimerRef.current = null;
              }, 180);
            }}
          />
        )}

        {command.type === "tag" && command.tag === "bg" && (
          <Flex gap="2" align="stretch">
            <Flex direction="column" gap="2" flex="1" minW="0">
              <EditorInput
                bg={isDark ? "gray.800" : "white"}
                color={isDark ? "gray.100" : "gray.900"}
                fontFamily={EDITOR_FONT}
                value={command.attrs.storage || ""}
                placeholder="bg url"
                onChange={(event) => setAttr("storage", event.target.value)}
              />
              <AppSelect
                value={bgTemplateOptions.some((item) => item.value === (command.attrs.storage || "")) ? command.attrs.storage || "" : ""}
                onChange={(nextValue) => {
                  if (nextValue) {
                    setAttr("storage", nextValue);
                  }
                }}
                options={bgTemplateOptions}
                isDark={isDark}
                fontFamily={EDITOR_FONT}
                placeholder="bg template"
              />
            </Flex>
            <ImagePreview
              src={command.attrs.storage || ""}
              alt="background preview"
              isDark={isDark}
            />
          </Flex>
        )}

        {command.type === "tag" && command.tag === "jump" && (
          <EditorInput
            bg={isDark ? "gray.800" : "white"}
            color={isDark ? "gray.100" : "gray.900"}
            fontFamily={EDITOR_FONT}
            value={command.attrs.target || ""}
            placeholder="target label"
            onChange={(event) => setAttr("target", event.target.value)}
          />
        )}

        {command.type === "tag" && command.tag === "chara_new" && (
          <Flex gap="2" align="stretch">
            <Flex direction="column" gap="2" flex="1" minW="0">
              <Grid templateColumns="1fr 1fr" gap="2">
                <EditorInput
                  bg={isDark ? "gray.800" : "white"}
                  color={isDark ? "gray.100" : "gray.900"}
                  fontFamily={EDITOR_FONT}
                  value={command.attrs.name || ""}
                  placeholder="name"
                  onChange={(event) => setAttr("name", event.target.value)}
                />
                <EditorInput
                  bg={isDark ? "gray.800" : "white"}
                  color={isDark ? "gray.100" : "gray.900"}
                  fontFamily={EDITOR_FONT}
                  value={command.attrs.storage || ""}
                  placeholder="image url"
                  onChange={(event) => setAttr("storage", event.target.value)}
                />
              </Grid>
              <AppSelect
                value={
                  charaTemplateOptions.some((item) => item.value === (command.attrs.storage || ""))
                    ? command.attrs.storage || ""
                    : ""
                }
                onChange={(nextValue) => {
                  if (nextValue) {
                    setAttr("storage", nextValue);
                  }
                }}
                options={charaTemplateOptions}
                isDark={isDark}
                fontFamily={EDITOR_FONT}
                placeholder="chara template"
              />
            </Flex>
            <ImagePreview
              src={command.attrs.storage || ""}
              alt="character preview"
              isDark={isDark}
            />
          </Flex>
        )}

        {command.type === "tag" &&
          (command.tag === "chara_show" || command.tag === "chara_hide") && (
            <AppSelect
              value={
                charaNameSelectOptions.some((item) => item.value === currentCharaName)
                  ? currentCharaName
                  : ""
              }
              onChange={(nextValue) => setAttr("name", nextValue)}
              options={charaNameSelectOptions}
              isDark={isDark}
              fontFamily={EDITOR_FONT}
              placeholder="name"
            />
          )}
        {errorMessage ? (
          <Text mt="1" color="red.500" fontSize="xs">
            {errorMessage}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
},
(prev, next) =>
  prev.command === next.command &&
  prev.errorMessage === next.errorMessage &&
  prev.characterNameOptions === next.characterNameOptions &&
  prev.isDark === next.isDark &&
  prev.iconButtonStyle === next.iconButtonStyle,
);

export default CommandEditor;
