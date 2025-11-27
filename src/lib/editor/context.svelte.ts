import { getContext, setContext } from "svelte";
import type { Composition } from "./composition/composition.svelte";

const DEFAULT_KEY = "$_editor_context";

type EditorContext = {
	comp: Composition | null;
	files: Array<File>;
};

export const getEditorState = (key = DEFAULT_KEY) => {
	return getContext<EditorContext>(key);
};

let comp: EditorContext["comp"] = $state(null);
let files: EditorContext["files"] = $state([]);

export const setEditorState = (key = DEFAULT_KEY) => {
	return setContext<EditorContext>(key, { comp, files });
};
