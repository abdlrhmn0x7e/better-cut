import { Project } from "$lib/project";

export const ssr = false;

export async function load({ params }) {
	const project = await Project.load(params.projectId);
	return { project };
}
