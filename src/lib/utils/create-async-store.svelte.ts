type AsyncState<T> =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "success"; data: T }
	| { status: "error"; error: Error };

export function createAsyncState<T>(fn: () => Promise<T>) {
	let state = $state<AsyncState<T>>({ status: "idle" });

	async function load() {
		state = { status: "loading" };
		try {
			const data = await fn();
			state = {
				status: "success",
				data
			};
		} catch (error: unknown) {
			if (error instanceof Error) {
				state = { status: "error", error };
				return;
			}

			state = { status: "error", error: new Error("Something went wrong") };
		}
	}

	return {
		get state() {
			return state;
		},
		load
	};
}
