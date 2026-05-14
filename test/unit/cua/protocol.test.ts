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

	it("#given malformed responses #when checked #then isResponse is false", () => {
		// given
		const missingResultAndError = { id: 7 };
		const missingErrorCode = { id: 8, error: { message: "boom" } };
		const missingErrorMessage = { id: 9, error: { code: -32000 } };

		// when / then
		expect(isResponse(missingResultAndError)).toBe(false);
		expect(isResponse(missingErrorCode)).toBe(false);
		expect(isResponse(missingErrorMessage)).toBe(false);
	});

	it("#given malformed ready events #when checked #then event guards are false", () => {
		// given
		const missingVersion = { type: "ready", cuaAvailable: true, cuaVersion: null, cuaImportError: null };
		const missingAvailability = { type: "ready", version: "0.1.0", cuaVersion: null, cuaImportError: null };

		// when / then
		expect(isEvent(missingVersion)).toBe(false);
		expect(isReadyEvent(missingVersion)).toBe(false);
		expect(isEvent(missingAvailability)).toBe(false);
		expect(isReadyEvent(missingAvailability)).toBe(false);
	});

	it("#given malformed log events #when checked #then event guards are false", () => {
		// given
		const missingLevel = { type: "log", message: "hello" };
		const unknownLevel = { type: "log", level: "trace", message: "hello" };
		const missingMessage = { type: "log", level: "info" };

		// when / then
		expect(isEvent(missingLevel)).toBe(false);
		expect(isLogEvent(missingLevel)).toBe(false);
		expect(isEvent(unknownLevel)).toBe(false);
		expect(isLogEvent(unknownLevel)).toBe(false);
		expect(isEvent(missingMessage)).toBe(false);
		expect(isLogEvent(missingMessage)).toBe(false);
	});

	it("#given random object #when checked #then guards are false", () => {
		// given
		const random = { foo: "bar" };
		// when / then
		expect(isResponse(random)).toBe(false);
		expect(isEvent(random)).toBe(false);
	});
});
