import type { AgentToolResult } from "../pi/index.js";

export function textResult<TDetails = undefined>(
	text: string,
	details?: TDetails,
): AgentToolResult<TDetails | undefined> {
	return {
		content: [{ type: "text", text }],
		details: details as TDetails | undefined,
	};
}

export function imageResult<TDetails = undefined>(
	pngBase64: string,
	details?: TDetails,
): AgentToolResult<TDetails | undefined> {
	return {
		content: [{ type: "image", data: pngBase64, mimeType: "image/png" }],
		details: details as TDetails | undefined,
	};
}

export function multiContentResult<TDetails = undefined>(
	pngBase64: string,
	text: string,
	details?: TDetails,
): AgentToolResult<TDetails | undefined> {
	return {
		content: [
			{ type: "image", data: pngBase64, mimeType: "image/png" },
			{ type: "text", text },
		],
		details: details as TDetails | undefined,
	};
}
