import { describe, expect, it } from "vitest";
import { parseStoredTagIds, serializeTagIds } from "./tag-filter-storage";

describe("serializeTagIds", () => {
	it("junta os ids selecionados com vírgula", () => {
		expect(serializeTagIds(["tag-1", "tag-2"])).toBe("tag-1,tag-2");
	});

	it("retorna null quando não há tarjas selecionadas", () => {
		expect(serializeTagIds([])).toBe(null);
	});
});

describe("parseStoredTagIds", () => {
	it("separa os ids salvos por vírgula", () => {
		expect(parseStoredTagIds("tag-1,tag-2")).toEqual(["tag-1", "tag-2"]);
	});

	it("retorna lista vazia quando não há valor salvo", () => {
		expect(parseStoredTagIds(null)).toEqual([]);
	});

	it("retorna lista vazia para um valor salvo vazio", () => {
		expect(parseStoredTagIds("")).toEqual([]);
	});
});
