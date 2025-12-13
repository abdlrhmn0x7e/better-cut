import { ALL_FORMATS, BlobSource, Input, InputAudioTrack, InputVideoTrack } from "mediabunny";

export type VideoProbe = {
	input: Input<BlobSource>;
	fps: number;
	video: InputVideoTrack;
	audio: InputAudioTrack | null;
	duration: number;
	dims: {
		width: number;
		height: number;
	};
};

export async function probeVideo(file: File) {
	const input = new Input({
		formats: ALL_FORMATS,
		source: new BlobSource(file)
	});

	const [videoTrack, audioTrack] = await Promise.all([
		input.getPrimaryVideoTrack(),
		input.getPrimaryAudioTrack()
	]);

	if (!videoTrack) {
		throw new Error("the given file isn't a video");
	}

	if (videoTrack.codec === null) {
		throw new Error("unsupported video codec");
	}

	if (!(await videoTrack.canDecode())) {
		throw new Error("cannot decode this video");
	}

	let supportedAudio = true;
	if (audioTrack) {
		if (audioTrack.codec === null) supportedAudio = false;
		if (!(await audioTrack.canDecode())) supportedAudio = false;
	}

	const [duration, packetStats] = await Promise.all([
		videoTrack.computeDuration(),
		videoTrack.computePacketStats()
	]);

	return {
		input,
		fps: packetStats.averagePacketRate,
		video: videoTrack,
		audio: supportedAudio ? audioTrack : null,
		duration,
		dims: {
			width: videoTrack.displayWidth,
			height: videoTrack.displayHeight
		}
	} satisfies VideoProbe;
}
