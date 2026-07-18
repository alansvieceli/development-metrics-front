import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";
import { SubmitButton } from "@/presentation/shared/submit-button";
import { DeleteTeamButton } from "@/presentation/team/delete-team-button";

type TeamManageViewProps = {
	team: Team;
	members: Member[];
	renameTeamAction: (formData: FormData) => void | Promise<void>;
	addMemberAction: (formData: FormData) => void | Promise<void>;
	renameMemberAction: (
		memberId: string,
		formData: FormData,
	) => void | Promise<void>;
	removeMemberAction: (memberId: string) => void | Promise<void>;
	deleteTeamAction: () => Promise<void>;
};

export function TeamManageView({
	team,
	members,
	renameTeamAction,
	addMemberAction,
	renameMemberAction,
	removeMemberAction,
	deleteTeamAction,
}: TeamManageViewProps) {
	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-xl font-semibold">Gerenciar time</h1>

			<form action={renameTeamAction} className="flex flex-col gap-2">
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
				<SubmitButton className="self-start rounded-lg border border-(--border) px-4 py-2 disabled:opacity-60">
					Salvar nome
				</SubmitButton>
			</form>

			<div className="flex flex-col gap-2">
				<p className="text-sm opacity-70">Membros</p>
				{members.map((member) => (
					<div
						key={member.id}
						className="flex items-center justify-between gap-2"
					>
						<form
							action={renameMemberAction.bind(null, member.id)}
							className="flex flex-1 gap-2"
						>
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
						<form action={removeMemberAction.bind(null, member.id)}>
							<SubmitButton
								aria-label="Remover membro"
								confirmMessage={`Remover ${member.name} do time?`}
								className="rounded-lg border border-(--border) p-1.5 disabled:opacity-60"
							>
								<Trash2 size={14} aria-hidden="true" />
							</SubmitButton>
						</form>
					</div>
				))}
			</div>

			<form action={addMemberAction} className="flex flex-col gap-2">
				<input
					name="name"
					placeholder="Nome do novo membro"
					className="rounded-lg border border-(--border) px-3 py-2"
					required
				/>
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
