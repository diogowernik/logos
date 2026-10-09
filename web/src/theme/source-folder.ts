import ButtonBase from "@mui/material/ButtonBase";
import { styled } from "@mui/material/styles";
export const SourceDropArea = styled(ButtonBase, {
    shouldForwardProp: (prop) => prop !== "dragging",
})<{
    dragging: boolean;
}>(({ theme, dragging }) => ({
    width: "100%", minHeight: 80, padding: theme.spacing(2),
    border: `1px dashed ${dragging ? theme.palette.primary.main : theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: dragging ? theme.palette.action.selected : "transparent",
    color: theme.palette.text.secondary, fontSize: "0.875rem",
    "&.Mui-focusVisible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
}));
