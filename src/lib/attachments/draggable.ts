import type { Attachment } from "svelte/attachments";

export function draggable(
	cb: (e: PointerEvent, element: HTMLDivElement) => void
): Attachment<HTMLDivElement> {
	return (element) => {
		let isDragging = false;

		const handlePointerUp = (e: PointerEvent) => {
			element.releasePointerCapture(e.pointerId);
			isDragging = false;
		};

		const handlePointerDown = (e: PointerEvent) => {
			element.setPointerCapture(e.pointerId); // makes sure the pointer up event is fired

			isDragging = true;
		};

		const handlePointerMove = (e: PointerEvent) => {
			if (!isDragging) return;

			// something
			cb(e, element);
		};

		element.addEventListener("pointerdown", handlePointerDown);
		element.addEventListener("pointermove", handlePointerMove);
		element.addEventListener("pointerup", handlePointerUp);

		return () => {
			element.removeEventListener("pointerdown", handlePointerDown);
			element.removeEventListener("pointermove", handlePointerMove);
			element.removeEventListener("pointerup", handlePointerUp);
		};
	};
}
