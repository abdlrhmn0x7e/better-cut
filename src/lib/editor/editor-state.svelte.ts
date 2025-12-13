import { getContext, setContext } from "svelte";
import { Composition } from "./composition/composition.svelte";
import { SvelteMap } from "svelte/reactivity";

const DEFAULT_KEY = "$_editor_context";

type EditorContext = {
	comp: Composition;
	files: SvelteMap<string, File>;
};

let comp: EditorContext["comp"] = $state(new Composition());
let files: EditorContext["files"] = new SvelteMap();

// Single shared context object, with comp wired to the rune
const editor: EditorContext = {
	get comp() {
		return comp;
	},
	set comp(value) {
		comp = value;
	},
	files
};

export const getEditorState = (key = DEFAULT_KEY) => {
	return getContext<EditorContext>(key);
};

export const setEditorState = (key = DEFAULT_KEY) => {
	return setContext<EditorContext>(key, editor);
};
