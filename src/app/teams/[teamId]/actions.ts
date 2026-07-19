"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function renameTeamAction(teamId: string, formData: FormData) {
	validateUuid(teamId, "Time inválido");
	const name = getName(formData);
	const useCases = createTeamUseCases();
	await useCases.renameTeam(teamId, name);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

export async function deleteTeamAction(teamId: string) {
	validateUuid(teamId, "Time inválido");
	const useCases = createTeamUseCases();
	await useCases.deleteTeam(teamId);
	revalidatePath("/teams");
	revalidatePath("/");
}

export async function addMemberAction(teamId: string, formData: FormData) {
	validateUuid(teamId, "Time inválido");
	const name = getName(formData);
	const useCases = createTeamUseCases();
	await useCases.addMember(teamId, name);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

export async function renameMemberAction(
	teamId: string,
	memberId: string,
	formData: FormData,
) {
	validateUuid(teamId, "Time inválido");
	validateUuid(memberId, "Membro inválido");
	const name = getName(formData);
	const useCases = createTeamUseCases();
	await useCases.renameMember(teamId, memberId, name);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

export async function removeMemberAction(teamId: string, memberId: string) {
	validateUuid(teamId, "Time inválido");
	validateUuid(memberId, "Membro inválido");
	const useCases = createTeamUseCases();
	await useCases.removeMember(teamId, memberId);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}
