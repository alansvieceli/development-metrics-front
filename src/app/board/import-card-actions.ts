"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid } from "@/application/shared/validation";
import type { CardImportPreview } from "@/application/task/use-cases/preview-card-import";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

async function getCurrentTeamId() {
	const team = await createTeamUseCases().getCurrentTeam();
	if (!team) throw new ApplicationError("Time não encontrado");
	return team.id;
}

export type PreviewCardImportResult =
	| { error: string; preview?: undefined }
	| { error: null; preview: CardImportPreview };

export async function previewCardImportAction(
	cardId: string,
): Promise<PreviewCardImportResult> {
	try {
		if (typeof cardId !== "string") {
			throw new ApplicationError("Id do card é obrigatório");
		}
		const teamId = await getCurrentTeamId();
		const preview = await createTaskUseCases().previewCardImport(
			teamId,
			cardId,
		);
		return { error: null, preview };
	} catch (error) {
		return {
			error:
				toActionState(error).error ?? "Não foi possível concluir a operação",
		};
	}
}

export type ConfirmCardImportInput = {
	preview: CardImportPreview;
	typeId: string;
	tagIds?: string[];
};

export async function confirmCardImportAction(
	input: ConfirmCardImportInput,
): Promise<ActionState> {
	try {
		if (!isUuid(input.typeId)) {
			throw new ApplicationError("Selecione o tipo da task");
		}
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().importCard(
			teamId,
			input.preview,
			input.typeId,
			input.tagIds,
		);
		revalidatePath("/board");
		return { error: null };
	} catch (error) {
		return toActionState(error);
	}
}
