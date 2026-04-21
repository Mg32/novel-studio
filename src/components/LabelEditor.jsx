import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Box, Flex, Input, Menu, Portal, Text } from "@chakra-ui/react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiChevronDown, FiChevronUp, FiMoreVertical, FiMove, FiPlus } from "react-icons/fi";
import TipIconButton from "./TipIconButton";
import CommandEditor from "./CommandEditor";
import { EDITOR_FONT } from "../constants/editor";

function EditorInput({ isDark, ...props }) {
  return (
    <Input
      size="sm"
      borderWidth="1px"
      borderColor={isDark ? "whiteAlpha.200" : "blackAlpha.100"}
      _hover={{ borderColor: isDark ? "whiteAlpha.200" : "blackAlpha.100" }}
      cursor="text"
      _focusVisible={{
        boxShadow: "0 0 0 1px rgba(96,165,250,0.85)",
        borderColor: isDark ? "whiteAlpha.200" : "blackAlpha.100",
      }}
      {...props}
    />
  );
}

function parseIndexId(id, prefix) {
  const value = String(id);
  if (!value.startsWith(prefix)) {
    return -1;
  }
  return Number(value.slice(prefix.length));
}

function createInsertedTextCommand() {
  return { type: "text", text: "new text" };
}

const SortableLabel = memo(function SortableLabel({
  id,
  labelData,
  labelIndex,
  labelOptions,
  isOpen,
  isDark,
  iconButtonStyle,
  onToggleOpen,
  onChangeLabelName,
  onDeleteLabel,
  onAddCommand,
  onCommandDragEnd,
  onCommandChange,
  onCommandDelete,
  onCommandAddAfter,
  commandErrors,
  characterNameOptions,
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null,
    ),
    transition: transition ?? "none",
    opacity: isDragging ? 0.6 : 1,
  };

  const commandIds = useMemo(
    () => labelData.commands.map((_, commandIndex) => `command-${labelIndex}-${commandIndex}`),
    [labelData.commands, labelIndex],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  return (
    <Box
      ref={setNodeRef}
      data-label-id={id}
      style={style}
      position="relative"
      pl={{ base: "1", md: "2" }}
      _after={{
        content: '""',
        position: "absolute",
        top: "0",
        bottom: "0",
        left: "0",
        width: "1px",
        bg: isDark ? "whiteAlpha.200" : "blackAlpha.200",
      }}
    >
      <Flex gap="1.5" align="center">
        <TipIconButton label="Toggle label" size="xs" {...iconButtonStyle} onClick={onToggleOpen}>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </TipIconButton>

        <Box flex="1" minW="0">
          <EditorInput
            isDark={isDark}
            bg={isDark ? "gray.800" : "white"}
            color={isDark ? "gray.100" : "gray.900"}
            fontFamily={EDITOR_FONT}
            value={labelData.label}
            placeholder="label"
            onChange={(event) => onChangeLabelName(event.target.value)}
          />
        </Box>

        <TipIconButton label="Drag label" size="xs" cursor="grab" {...iconButtonStyle} {...attributes} {...listeners}>
          <FiMove />
        </TipIconButton>

        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Menu.Trigger asChild>
            <Box>
              <TipIconButton label="Label menu" size="xs" {...iconButtonStyle}>
                <FiMoreVertical />
              </TipIconButton>
            </Box>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="add-command" onSelect={onAddCommand}>
                  Add command
                </Menu.Item>
                <Menu.Item value="delete-label" color="red.500" onSelect={onDeleteLabel}>
                  Delete label
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Flex>

      {isOpen ? (
        <Box pt="1.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCommandDragEnd}>
            <SortableContext items={commandIds} strategy={verticalListSortingStrategy}>
              <Flex direction="column" gap="1.5">
                {labelData.commands.map((command, commandIndex) => (
                  <SortableCommand
                    key={commandIds[commandIndex]}
                    id={commandIds[commandIndex]}
                    command={command}
                    isDark={isDark}
                    iconButtonStyle={iconButtonStyle}
                    onChange={(nextCommand) => onCommandChange(commandIndex, nextCommand)}
                    onDelete={() => onCommandDelete(commandIndex)}
                    onAddAfter={() => onCommandAddAfter(commandIndex)}
                    errorMessage={commandErrors?.[commandIndex] || ""}
                    labelOptions={labelOptions}
                    characterNameOptions={characterNameOptions}
                  />
                ))}
              </Flex>
            </SortableContext>
          </DndContext>
        </Box>
      ) : null}
    </Box>
  );
},
(prev, next) =>
  prev.id === next.id &&
  prev.labelData === next.labelData &&
  prev.labelIndex === next.labelIndex &&
  prev.labelOptions === next.labelOptions &&
  prev.isOpen === next.isOpen &&
  prev.isDark === next.isDark &&
  prev.iconButtonStyle === next.iconButtonStyle &&
  prev.commandErrors === next.commandErrors &&
  prev.characterNameOptions === next.characterNameOptions,
);

const SortableCommand = memo(function SortableCommand({
  id,
  command,
  labelOptions,
  isDark,
  iconButtonStyle,
  onChange,
  onDelete,
  onAddAfter,
  errorMessage,
  characterNameOptions,
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null,
    ),
    transition: transition ?? "none",
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Box ref={setNodeRef} data-command-id={id} style={style} pl={{ base: "1", md: "2" }}>
      <CommandEditor
        command={command}
        errorMessage={errorMessage}
        labelOptions={labelOptions}
        characterNameOptions={characterNameOptions}
        isDark={isDark}
        iconButtonStyle={iconButtonStyle}
        onChange={onChange}
        onDelete={onDelete}
        onAddAfter={onAddAfter}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </Box>
  );
},
(prev, next) =>
  prev.id === next.id &&
  prev.command === next.command &&
  prev.errorMessage === next.errorMessage &&
  prev.labelOptions === next.labelOptions &&
  prev.characterNameOptions === next.characterNameOptions &&
  prev.isDark === next.isDark &&
  prev.iconButtonStyle === next.iconButtonStyle,
);

const LabelEditor = memo(function LabelEditor({
  scenes,
  labelOptions,
  onChange,
  isDark,
  iconButtonStyle,
  jumpTo,
  commandErrorMap,
  characterNameOptions,
}) {
  const labelIds = useMemo(() => scenes.map((_, labelIndex) => `label-${labelIndex}`), [scenes]);
  const [openLabelIds, setOpenLabelIds] = useState(labelIds);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const normalizedOpenLabelIds = useMemo(() => {
    const base = openLabelIds.filter((id) => labelIds.includes(id));
    if (jumpTo?.labelIndex == null) {
      return base;
    }
    const forced = `label-${jumpTo.labelIndex}`;
    return base.includes(forced) ? base : [...base, forced];
  }, [openLabelIds, labelIds, jumpTo]);

  const updateLabel = useCallback(
    (labelIndex, updater) => {
      onChange(
        scenes.map((scene, index) => {
          if (index !== labelIndex) {
            return scene;
          }
          return updater(scene);
        }),
      );
    },
    [scenes, onChange],
  );

  const deleteLabel = useCallback(
    (labelIndex) => {
      const nextScenes = scenes.filter((_, index) => index !== labelIndex);
      if (nextScenes.length === 0) {
        onChange([{ label: "start", commands: [] }]);
        return;
      }
      onChange(nextScenes);
    },
    [scenes, onChange],
  );

  const handleLabelDragEnd = useCallback(
    ({ active, over }) => {
      if (!over || active.id === over.id) {
        return;
      }
      const activeIndex = parseIndexId(active.id, "label-");
      const overIndex = parseIndexId(over.id, "label-");
      if (activeIndex < 0 || overIndex < 0) {
        return;
      }
      onChange(arrayMove(scenes, activeIndex, overIndex));
    },
    [scenes, onChange],
  );

  const handleCommandDragEnd = useCallback(
    (labelIndex) => ({ active, over }) => {
      if (!over || active.id === over.id) {
        return;
      }
      const commandPrefix = `command-${labelIndex}-`;
      const activeIndex = parseIndexId(active.id, commandPrefix);
      const overIndex = parseIndexId(over.id, commandPrefix);
      if (activeIndex < 0 || overIndex < 0) {
        return;
      }
      updateLabel(labelIndex, (scene) => ({
        ...scene,
        commands: arrayMove(scene.commands, activeIndex, overIndex),
      }));
    },
    [updateLabel],
  );

  useEffect(() => {
    if (!jumpTo || jumpTo.labelIndex == null) {
      return;
    }
    const scrollTimer = window.setTimeout(() => {
      const commandId =
        jumpTo.commandIndex != null
          ? `command-${jumpTo.labelIndex}-${jumpTo.commandIndex}`
          : null;
      const labelId = `label-${jumpTo.labelIndex}`;
      const selector = commandId
        ? `[data-command-id="${commandId}"]`
        : `[data-label-id="${labelId}"]`;
      const target = document.querySelector(selector);
      if (target && "scrollIntoView" in target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusTarget =
          target.querySelector("textarea, input:not([type='hidden'])") ||
          target.querySelector("button, [role='combobox']");
        if (focusTarget && "focus" in focusTarget) {
          focusTarget.focus({ preventScroll: true });
        }
      }
    }, 60);

    return () => window.clearTimeout(scrollTimer);
  }, [jumpTo]);

  return (
    <Flex direction="column" gap="1.5" pr="2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLabelDragEnd}>
        <SortableContext items={labelIds} strategy={verticalListSortingStrategy}>
          <Flex direction="column" gap="1.5">
            {scenes.map((scene, labelIndex) => (
              <SortableLabel
                key={labelIds[labelIndex]}
                id={labelIds[labelIndex]}
                labelData={scene}
                labelIndex={labelIndex}
                labelOptions={labelOptions}
                isOpen={normalizedOpenLabelIds.includes(labelIds[labelIndex])}
                isDark={isDark}
                iconButtonStyle={iconButtonStyle}
                onToggleOpen={() =>
                  setOpenLabelIds((current) =>
                    current.includes(labelIds[labelIndex])
                      ? current.filter((value) => value !== labelIds[labelIndex])
                      : [...current, labelIds[labelIndex]],
                  )
                }
                onChangeLabelName={(label) =>
                  updateLabel(labelIndex, (sceneData) => ({ ...sceneData, label }))
                }
                onDeleteLabel={() => deleteLabel(labelIndex)}
                onAddCommand={() =>
                  updateLabel(labelIndex, (sceneData) => ({
                    ...sceneData,
                    commands: [...sceneData.commands, createInsertedTextCommand()],
                  }))
                }
                onCommandDragEnd={handleCommandDragEnd(labelIndex)}
                onCommandChange={(commandIndex, nextCommand) =>
                  updateLabel(labelIndex, (sceneData) => ({
                    ...sceneData,
                    commands: sceneData.commands.map((command, index) =>
                      index === commandIndex ? nextCommand : command,
                    ),
                  }))
                }
                onCommandDelete={(commandIndex) =>
                  updateLabel(labelIndex, (sceneData) => ({
                    ...sceneData,
                    commands: sceneData.commands.filter((_, index) => index !== commandIndex),
                  }))
                }
                onCommandAddAfter={(commandIndex) =>
                  updateLabel(labelIndex, (sceneData) => ({
                    ...sceneData,
                    commands: [
                      ...sceneData.commands.slice(0, commandIndex + 1),
                      createInsertedTextCommand(),
                      ...sceneData.commands.slice(commandIndex + 1),
                    ],
                  }))
                }
                commandErrors={commandErrorMap?.[labelIndex] || {}}
                characterNameOptions={characterNameOptions}
              />
            ))}
          </Flex>
        </SortableContext>
      </DndContext>

      <TipIconButton
        alignSelf="flex-start"
        label="Add label"
        size="sm"
        {...iconButtonStyle}
        onClick={() => {
          const nextLabels = [...scenes, { label: `label_${scenes.length + 1}`, commands: [] }];
          onChange(nextLabels);
          setOpenLabelIds(nextLabels.map((_, index) => `label-${index}`));
        }}
      >
        <FiPlus />
      </TipIconButton>

      {scenes.length === 0 ? (
        <Text fontSize="xs" color={isDark ? "gray.300" : "gray.600"}>
          No labels.
        </Text>
      ) : null}
    </Flex>
  );
});

export default LabelEditor;
