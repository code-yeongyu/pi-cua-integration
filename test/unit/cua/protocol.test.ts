import { describe, expect, it } from "vitest";

import { isEvent, isLogEvent, isReadyEvent, isResponse } from "../../../src/cua/protocol.js";

describe("protocol type guards", () => {
	it("#given a ready event #when checked #then isReadyEvent is true", () => {
		// given
		const event = {
			type: "ready",
			version: "0.1.0",
			cuaAvailable: true,
			cuaVersion: "0.7.0",
			cuaImportError: null,
		};
		// when / then
		expect(isReadyEvent(event)).toBe(true);
		expect(isEvent(event)).toBe(true);
	});

	it("#given a log event #when checked #then isLogEvent is true", () => {
		// given
		const event = { type: "log", level: "info", message: "hello" };
		// when / then
		expect(isLogEvent(event)).toBe(true);
		expect(isEvent(event)).toBe(true);
	});

	it("#given a response with id+result #when checked #then isResponse is true", () => {
		// given
		const response = { id: 7, result: { ok: true } };
		// when / then
		expect(isResponse(response)).toBe(true);
	});

	it("#given a response with id+error #when checked #then isResponse is true", () => {
		// given
		const response = { id: 9, error: { code: -32000, message: "boom" } };
		// when / then
		expect(isResponse(response)).toBe(true);
	});

	it("#given random object #when checked #then guards are false", () => {
		// given
		const random = { foo: "bar" };
		// when / then
		expect(isResponse(random)).toBe(false);
		expect(isEvent(random)).toBe(false);
	});
});
