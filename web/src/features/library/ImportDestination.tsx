import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import type { TextGroup } from "./types";

export type ImportDestinationProps = {
  groups: TextGroup[]; target: string; name: string; disabled: boolean;
  onTarget: (target: string) => void; onName: (name: string) => void;
};
export function ImportDestination({groups, target, name, disabled, onTarget, onName}: ImportDestinationProps) {
  return <Stack spacing={2}>
    <TextField select label="Destino dos textos" value={target} disabled={disabled} onChange={(event) => onTarget(event.target.value)}>
      <MenuItem value="new">Novo grupo</MenuItem>
      {groups.map((group) => <MenuItem key={group.id} value={String(group.id)}>{group.name}</MenuItem>)}
    </TextField>
    {target === "new" && <TextField label="Nome do novo grupo" value={name} required disabled={disabled} slotProps={{htmlInput: {maxLength: 250}}} onChange={(event) => onName(event.target.value)}/>}
  </Stack>;
}
