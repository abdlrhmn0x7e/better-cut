import { createContext } from "svelte";
import { Project } from "./project.svelte";

export const [getProjectContext, setProjectContext] = createContext<Project>();

export function getProject() {
	return getProjectContext();
}

export function setProject(project: Project) {
	return setProjectContext(project);
}
