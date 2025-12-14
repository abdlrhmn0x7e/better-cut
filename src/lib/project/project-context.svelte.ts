import { createContext } from "svelte";
import { Project } from "./project.svelte";

export const [getProjectContext, setProjectContext] = createContext<Project>();

export function getProject() {
	return getProjectContext();
}

export async function setTimelineState(id: string) {
	const project = await Project.load(id);
	return setProjectContext(project);
}
