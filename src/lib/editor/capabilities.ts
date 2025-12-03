export function supportsWebCodecs() {
	return !!VideoDecoder && !!VideoEncoder && !!AudioDecoder && !!AudioEncoder;
}
