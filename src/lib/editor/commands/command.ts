import { createContext } from "svelte";

export abstract class Command {
	abstract execute(): void;
	abstract undo(): void;
}

type CommandContext = {
	id: string;
	type: "composition" | "layer";
};
export const [getCommandContext, setCommandContext] = createContext<CommandContext>();

export function getProject() {
	return getCommandContext();
}

export async function setTimelineState(id: string, type: "composition" | "layer") {
	return setCommandContext({ id, type });
}
