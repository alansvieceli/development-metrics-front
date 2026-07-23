import { ApplicationError } from "@/application/shared/application-error";
import { matchesEitherWay } from "@/application/shared/fuzzy-match";
import { matchExternalStatus } from "@/application/task/match-external-status";
import type { ExternalCardProvider } from "@/application/task/ports/external-card-provider";
import type { TeamRepository } from "@/application/team/ports/team-repository";
import type { TaskStatus } from "@/domain/task/entities/task";
import type { Member } from "@/domain/team/entities/member";

export type CardImportPreview = {
	externalId: string;
	description: string;
	dueDate: string;
	ownerName: string | null;
	resolvedAssigneeId: string | null;
	steps: { status: TaskStatus; date: string }[];
	warnings: string[];
};

function matchMemberByName(members: Member[], ownerName: string): Member | null {
	return members.find((member) => matchesEitherWay(member.name, ownerName)) ?? null;
}

export async function previewCardImport(
	provider: ExternalCardProvider,
	teamRepository: TeamRepository,
	teamId: string,
	cardId: string,
): Promise<CardImportPreview> {
	const trimmedCardId = cardId.trim();
	if (!trimmedCardId) {
		throw new ApplicationError("Id do card é obrigatório");
	}

	const card = await provider.fetchCard(trimmedCardId);
	if (!card.dueDate) {
		throw new ApplicationError("O card não possui deadline definido no Businessmap");
	}
	if (card.steps.length === 0) {
		throw new ApplicationError("O card não possui histórico de movimentação");
	}

	const steps: { status: TaskStatus; date: string }[] = [];
	for (const step of card.steps) {
		const status = matchExternalStatus(step.columnLabel);
		if (!status) {
			throw new ApplicationError(
				`Não foi possível mapear a etapa "${step.columnLabel}" para um status conhecido`,
			);
		}
		const date = step.changedAt.toISOString().slice(0, 10);
		const last = steps[steps.length - 1];
		if (last && last.status === status) continue;
		steps.push({ status, date });
	}
	if (steps.length === 0) {
		throw new ApplicationError("Nenhuma etapa válida encontrada no histórico do card");
	}

	const warnings: string[] = [];
	let resolvedAssigneeId: string | null = null;
	if (card.ownerName) {
		const members = await teamRepository.listMembers(teamId);
		const match = matchMemberByName(members, card.ownerName);
		if (match) {
			resolvedAssigneeId = match.id;
		} else {
			warnings.push(
				`Responsável "${card.ownerName}" não encontrado entre os membros do time; será importado sem responsável`,
			);
		}
	} else {
		warnings.push("Card não possui responsável definido no Businessmap");
	}

	return {
		externalId: card.externalId,
		description: card.description,
		dueDate: card.dueDate,
		ownerName: card.ownerName,
		resolvedAssigneeId,
		steps,
		warnings,
	};
}
