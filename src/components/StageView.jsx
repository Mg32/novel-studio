import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

function StageView({ frame, aspect, isDark, maxHeight = "58dvh", emptyMessage, onAdvance, canAdvance }) {
  const isWide = aspect === "16:9";
  const stageStyle = isWide ? { aspectRatio: "16 / 9" } : { aspectRatio: "9 / 16" };
  const fullMessage = frame?.message || "";
  const [displayMessage, setDisplayMessage] = useState("");
  const timerRef = useRef(null);
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!frame || fullMessage.length === 0) {
      return undefined;
    }

    let index = 0;
    timerRef.current = setInterval(() => {
      index += 1;
      setDisplayMessage(fullMessage.slice(0, index));
      if (index >= fullMessage.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 24);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [frame, fullMessage]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) {
        return;
      }
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);
      setStageSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const baseSize = Math.max(1, Math.min(stageSize.width || 0, stageSize.height || 0));
  const speakerFontPx = Math.max(11, Math.round(baseSize * 0.045));
  const messageFontPx = Math.max(11, Math.round(baseSize * 0.05));
  const speakerFontSize = `${speakerFontPx}px`;
  const messageFontSize = `${messageFontPx}px`;
  const messageBoxMinHeight = `${Math.max(88, Math.round(messageFontPx * 4.8))}px`;

  const isTyping = Boolean(frame) && displayMessage.length < fullMessage.length;

  const handleStageTap = () => {
    if (!frame) {
      onAdvance?.();
      return;
    }
    if (isTyping) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setDisplayMessage(fullMessage);
      return;
    }
    if (canAdvance) {
      onAdvance?.();
    }
  };

  return (
    <Flex align="center" justify="center" h={maxHeight} minH="0" w="100%">
      <Box
        ref={stageRef}
        position="relative"
        overflow="hidden"
        rounded="md"
        bg="black"
        style={stageStyle}
        w={isWide ? "100%" : "auto"}
        h={isWide ? "auto" : "100%"}
        maxW="100%"
        maxH="100%"
        onPointerUp={handleStageTap}
        cursor="pointer"
      >
        {frame ? (
          <>
            <Box
              position="absolute"
              inset="0"
              bgImage={frame.background ? `url(${frame.background})` : undefined}
              bgSize="cover"
              bgPos="center"
            />
            <Flex position="absolute" inset="3" align="flex-end" justify="center" gap="2">
              {frame.characters.map((character) => (
                <Box
                  key={character.name}
                  as="img"
                  src={character.storage}
                  alt={character.name}
                  maxH="78%"
                  maxW="44%"
                  objectFit="contain"
                />
              ))}
            </Flex>
            <Box position="absolute" insetX="2" bottom="2" display="flex" flexDirection="column" gap="1.5">
              {frame.speaker ? (
                <Box
                  alignSelf="flex-start"
                  rounded="md"
                  px="2"
                  py="1"
                  bg={isDark ? "rgba(17,24,39,0.95)" : "rgba(255,255,255,0.95)"}
                >
                  <Text fontSize={speakerFontSize} fontWeight="semibold" color={isDark ? "gray.100" : "gray.800"}>
                    {frame.speaker}
                  </Text>
                </Box>
              ) : null}
              <Box
                rounded="md"
                bg={isDark ? "rgba(17,24,39,0.9)" : "rgba(255,255,255,0.9)"}
                p="2"
                minH={messageBoxMinHeight}
              >
                <Text whiteSpace="pre-wrap" fontSize={messageFontSize} color={isDark ? "gray.100" : "gray.800"}>
                  {fullMessage.length === 0 ? "" : displayMessage}
                </Text>
              </Box>
            </Box>
          </>
        ) : (
          <Flex position="absolute" inset="0" align="center" justify="center" p="3">
            <Text fontSize="sm" color={isDark ? "gray.300" : "gray.600"}>
              {emptyMessage}
            </Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

export default StageView;
