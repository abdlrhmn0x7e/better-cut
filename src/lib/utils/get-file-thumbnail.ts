import sound from "$lib/assets/images/sound.png";

export function getFileThumbnail(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		if (file.type.startsWith("video")) {
			const canvas = document.createElement("canvas");
			const video = document.createElement("video");

			// this is important
			video.autoplay = true;
			video.muted = true;
			video.src = URL.createObjectURL(file);

			video.onloadeddata = () => {
				const ctx = canvas.getContext("2d");
				if (!ctx) throw new Error("Your browser doesn't support 2d canvas context");

				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;

				ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
				video.pause();
				return resolve(canvas.toDataURL("image/png"));
			};

			video.onerror = () => reject();
		}

		if (file.type.startsWith("audio")) {
			return resolve(sound);
		}

		if (file.type.startsWith("image")) {
			return resolve(URL.createObjectURL(file));
		}
	});
}
