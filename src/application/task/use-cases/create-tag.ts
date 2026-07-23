import type { TagRepository } from "@/application/task/ports/tag-repository";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export async function createTag(
	repository: TagRepository,
	name: string,
	color: string,
) {
	const trimmedName = name.trim();
	if (!trimmedName) {
		throw new Error("Nome da tarja não pode ser vazio");
	}
	if (!HEX_COLOR_PATTERN.test(color)) {
		throw new Error("Cor deve ser um hexadecimal válido, ex: #2563eb");
	}
	return repository.create(trimmedName, color);
}
