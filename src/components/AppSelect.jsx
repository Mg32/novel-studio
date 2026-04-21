import { memo, useCallback, useMemo } from "react";
import { Portal, Select, createListCollection } from "@chakra-ui/react";

const AppSelect = memo(function AppSelect({ value, onChange, options, isDark, fontFamily, placeholder }) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: options.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      }),
    [options],
  );
  const handleValueChange = useCallback(
    (detail) => onChange(detail.value[0] ?? ""),
    [onChange],
  );

  return (
    <Select.Root
      size="sm"
      collection={collection}
      value={value ? [value] : []}
      onValueChange={handleValueChange}
      positioning={{ sameWidth: true }}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger
          bg={isDark ? "gray.800" : "white"}
          color={isDark ? "gray.400" : "gray.700"}
          borderWidth="0"
          fontFamily={fontFamily}
          cursor="pointer"
          pe="0"
          _focusVisible={{
            boxShadow: isDark ? "0 0 0 1px rgba(96,165,250,0.85)" : "0 0 0 1px rgba(37,99,235,0.75)",
          }}
        >
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup
          px="2"
          minW="9"
          justifyContent="center"
          bg="transparent"
        >
          <Select.Indicator color={isDark ? "gray.300" : "gray.500"} />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content
            bg={isDark ? "gray.800" : "white"}
            borderWidth="1px"
            borderColor={isDark ? "whiteAlpha.200" : "blackAlpha.100"}
            boxShadow={isDark ? "0 12px 28px rgba(0,0,0,0.55)" : "0 12px 28px rgba(15,23,42,0.14)"}
          >
            {collection.items.map((item, index) => (
              <Select.Item
                key={`${item.value}-${index}`}
                item={item}
                color={isDark ? "gray.300" : "gray.800"}
                _highlighted={{
                  bg: isDark ? "whiteAlpha.200" : "blackAlpha.100",
                  color: isDark ? "white" : "gray.900",
                }}
                _checked={{
                  bg: isDark ? "blue.700" : "blue.100",
                  color: isDark ? "white" : "blue.900",
                }}
              >
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
});

export default AppSelect;
