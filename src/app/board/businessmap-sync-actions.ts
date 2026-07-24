"use server";

import { ApplicationError } from "@/application/shared/application-error";
import type { CardSyncResult } from "@/application/task/use-cases/check-card-sync";
import type { ColumnDiffResult } from "@/application/task/use-cases/diff-column-with-businessmap";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import type { TaskStatus } from "@/domain/task/entities/task";

function toErrorMessage(error: unknown): string {
	if (error instanceof ApplicationError) return error.message;
	console.error(error);
	return "Não foi possível concluir a operação";
}

async function getCurrentTeamId() {
	const team = await createTeamUseCases().getCurrentTeam();
	if (!team) throw new ApplicationError("Time não encontrado");
	return team.id;
}

export type CheckCardSyncActionResult =
	| { error: string; sync?: undefined }
	| { error: null; sync: CardSyncResult };

export async function checkCardSyncAction(
	externalId: string,
	localStatus: TaskStatus,
): Promise<CheckCardSyncActionResult> {
	try {
		const sync = await createTaskUseCases().checkCardSync(
			externalId,
			localStatus,
		);
		return { error: null, sync };
	} catch (error) {
		return { error: toErrorMessage(error) };
	}
}

export type DiffColumnActionResult =
	| { error: string; diff?: undefined }
	| { error: null; diff: ColumnDiffResult };

export async function diffColumnAction(
	status: TaskStatus,
	localExternalIds: string[],
): Promise<DiffColumnActionResult> {
	try {
		const teamId = await getCurrentTeamId();
		const diff = await createTaskUseCases().diffColumnWithBusinessmap(
			teamId,
			status,
			localExternalIds,
		);
		return { error: null, diff };
	} catch (error) {
		return { error: toErrorMessage(error) };
	}
}
