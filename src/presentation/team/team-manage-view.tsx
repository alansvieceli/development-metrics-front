"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";
import { SubmitButton } from "@/presentation/shared/submit-button";
import { DeleteTeamButton } from "@/presentation/team/delete-team-button";

type TeamManageViewProps = {
	team: Team;
	members: Member[];
	renameTeamAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	setWipLimitAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	addMemberAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	renameMemberAction: (
		memberId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	removeMemberAction: (
		memberId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	deleteTeamAction: () => Promise<ActionState>;
};

function MemberRow({
	member,
	renameMemberAction,
	removeMemberAction,
}: {
	member: Member;
	renameMemberAction: TeamManageViewProps["renameMemberAction"];
	removeMemberAction: TeamManageViewProps["removeMemberAction"];
}) {
	const [renameState, renameAction] = useActionState(
		renameMemberAction.bind(null, member.id),
		INITIAL_ACTION_STATE,
	);
	const [removeState, removeAction] = useActionState(
		removeMemberAction.bind(null, member.id),
		INITIAL_ACTION_STATE,
	);

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between gap-2">
				<form action={renameAction} className="flex flex-1 gap-2">
					<input
						name="name"
						defaultValue={member.name}
						className="flex-1 rounded-lg border border-(--border) px-2 py-1"
						required
					/>
					<SubmitButton
						aria-label="Renomear membro"
						className="rounded-lg border border-(--border) p-1.5 disabled:opacity-60"
					>
						<Pencil size={14} aria-hidden="true" />
					</SubmitButton>
				</form>
				<form action={removeAction}>
					<SubmitButton
						aria-label="Remover membro"
						confirmMessage={`Remover ${member.name} do time?`}
						className="rounded-lg border border-(--border) p-1.5 disabled:opacity-60"
					>
						<Trash2 size={14} aria-hidden="true" />
					</SubmitButton>
				</form>
			</div>
			{renameState.error ? <p role="alert">{renameState.error}</p> : null}
			{removeState.error ? <p role="alert">{removeState.error}</p> : null}
		</div>
	);
}

export function TeamManageView({
	team,
	members,
	renameTeamAction,
	setWipLimitAction,
	addMemberAction,
	renameMemberAction,
	removeMemberAction,
	deleteTeamAction,
}: TeamManageViewProps) {
	const [renameState, renameAction] = useActionState(
		renameTeamAction,
		INITIAL_ACTION_STATE,
	);
	const [addState, addAction] = useActionState(
		addMemberAction,
		INITIAL_ACTION_STATE,
	);
	const [wipLimitState, wipLimitAction] = useActionState(
		setWipLimitAction,
		INITIAL_ACTION_STATE,
	);

	return (
		<div className="flex flex-col gap-6">
			<form action={renameAction} className="flex flex-col gap-2">
				<label htmlFor="team-name" className="text-sm opacity-70">
					Nome do time
				</label>
				<input
					id="team-name"
					name="name"
					defaultValue={team.name}
					className="rounded-lg border border-(--border) px-3 py-2"
					required
				/>
				{renameState.error ? <p role="alert">{renameState.error}</p> : null}
				<SubmitButton className="self-start rounded-lg border border-(--border) px-4 py-2 disabled:opacity-60">
					Salvar nome
				</SubmitButton>
			</form>

			<form action={wipLimitAction} className="flex flex-col gap-2">
				<label htmlFor="team-wip-limit" className="text-sm opacity-70">
					Limite de WIP
				</label>
				<input
					id="team-wip-limit"
					name="wipLimit"
					type="number"
					min="1"
					step="1"
					defaultValue={team.wipLimit}
					className="rounded-lg border border-(--border) px-3 py-2"
					required
				/>
				{wipLimitState.error ? <p role="alert">{wipLimitState.error}</p> : null}
				<SubmitButton className="self-start rounded-lg border border-(--border) px-4 py-2 disabled:opacity-60">
					Salvar limite
				</SubmitButton>
			</form>

			<div className="flex flex-col gap-2">
				<p className="text-sm opacity-70">Membros</p>
				{members.map((member) => (
					<MemberRow
						key={member.id}
						member={member}
						renameMemberAction={renameMemberAction}
						removeMemberAction={removeMemberAction}
					/>
				))}
			</div>

			<form action={addAction} className="flex flex-col gap-2">
				<input
					name="name"
					placeholder="Nome do novo membro"
					className="rounded-lg border border-(--border) px-3 py-2"
					required
				/>
				{addState.error ? <p role="alert">{addState.error}</p> : null}
				<SubmitButton className="flex items-center gap-1 self-start rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60">
					<Plus size={16} aria-hidden="true" />
					Adicionar membro
				</SubmitButton>
			</form>

			<hr className="border-(--border)" />
			<DeleteTeamButton
				teamName={team.name}
				deleteTeamAction={deleteTeamAction}
			/>
		</div>
	);
}
