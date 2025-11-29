import { getContext, setContext } from "svelte";
import type { Composition } from "./composition/composition.svelte";
import { SvelteMap } from "svelte/reactivity";

const DEFAULT_KEY = "$_editor_context";

type EditorContext = {
	comp: Composition | null;
	files: SvelteMap<string, File>;
};

export const getEditorState = (key = DEFAULT_KEY) => {
	return getContext<EditorContext>(key);
};

let comp: EditorContext["comp"] = $state(null);
let files: EditorContext["files"] = new SvelteMap();

export const setEditorState = (key = DEFAULT_KEY) => {
	return setContext<EditorContext>(key, { comp, files });
};
