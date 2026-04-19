import { IconButton, Portal, Tooltip } from "@chakra-ui/react";

function TipIconButton({ label, children, ...props }) {
  return (
    <Tooltip.Root openDelay={180} closeDelay={70} positioning={{ placement: "top" }}>
      <Tooltip.Trigger asChild>
        <IconButton aria-label={label} {...props}>
          {children}
        </IconButton>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content zIndex="tooltip">{label}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

export default TipIconButton;
