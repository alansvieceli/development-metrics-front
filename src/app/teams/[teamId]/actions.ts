"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid } from "@/application/shared/validation";
import { createTeamUseCases } from "@/composition/team";

function validateUuid(
	value: unknown,
	message: string,
): asserts value is string {
	if (!isUuid(value)) throw new ApplicationError(message);
}

function getName(formData: FormData) {
	const name = formData.get("name");
	if (typeof name !== "string") throw new ApplicationError("Nome inválido");
	return name;
}

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

export async function renameTeamAction(
	teamId: string,
	_previousState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const path = `/teams/${teamId}`;
	try {
		validateUuid(teamId, "Time inválido");
		const useCases = createTeamUseCases();
		await useCases.renameTeam(teamId, getName(formData));
		revalidatePath(path);
	} catch (error) {
		return toActionState(error);
	}
	redirect(path);
}

export async function setWipLimitAction(
	teamId: string,
	_previousState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const path = `/teams/${teamId}`;
	try {
		validateUuid(teamId, "Time inválido");
		const useCases = createTeamUseCases();
		await useCases.setWipLimit(teamId, Number(formData.get("wipLimit")));
		revalidatePath(path);
		revalidatePath("/metrics");
	} catch (error) {
		return toActionState(error);
	}
	redirect(path);
}

export async function deleteTeamAction(teamId: string): Promise<ActionState> {
	try {
		validateUuid(teamId, "Time inválido");
		const useCases = createTeamUseCases();
		await useCases.deleteTeam(teamId);
		revalidatePath("/teams");
		revalidatePath("/");
		return { error: null };
	} catch (error) {
		return toActionState(error);
	}
}

export async function addMemberAction(
	teamId: string,
	_previousState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const path = `/teams/${teamId}`;
	try {
		validateUuid(teamId, "Time inválido");
		const useCases = createTeamUseCases();
		await useCases.addMember(teamId, getName(formData));
		revalidatePath(path);
	} catch (error) {
		return toActionState(error);
	}
	redirect(path);
}

export async function renameMemberAction(
	teamId: string,
	memberId: string,
	_previousState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const path = `/teams/${teamId}`;
	try {
		validateUuid(teamId, "Time inválido");
		validateUuid(memberId, "Membro inválido");
		const useCases = createTeamUseCases();
		await useCases.renameMember(teamId, memberId, getName(formData));
		revalidatePath(path);
	} catch (error) {
		return toActionState(error);
	}
	redirect(path);
}

export async function removeMemberAction(
	teamId: string,
	memberId: string,
	_previousState: ActionState,
	_formData: FormData,
): Promise<ActionState> {
	const path = `/teams/${teamId}`;
	try {
		validateUuid(teamId, "Time inválido");
		validateUuid(memberId, "Membro inválido");
		const useCases = createTeamUseCases();
		await useCases.removeMember(teamId, memberId);
		revalidatePath(path);
	} catch (error) {
		return toActionState(error);
	}
	redirect(path);
}
