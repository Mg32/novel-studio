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
          color={isDark ? "gray.100" : "gray.900"}
          borderWidth="0"
          fontFamily={fontFamily}
        >
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content bg={isDark ? "gray.800" : "white"} borderWidth="0">
            {collection.items.map((item) => (
              <Select.Item key={item.value} item={item} color={isDark ? "gray.100" : "gray.900"}>
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
