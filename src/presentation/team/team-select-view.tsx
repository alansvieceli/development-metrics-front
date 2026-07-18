import type { Team } from "@/domain/team/entities/team";
import { SubmitButton } from "@/presentation/shared/submit-button";

type TeamSelectViewProps = {
	teams: Team[];
	createTeamAction: (formData: FormData) => void | Promise<void>;
	selectTeamAction: (teamId: string) => void | Promise<void>;
};

export function TeamSelectView({
	teams,
	createTeamAction,
	selectTeamAction,
}: TeamSelectViewProps) {
	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-xl font-semibold">Selecionar time</h1>
			{teams.length === 0 ? (
				<p className="text-sm opacity-70">
					Nenhum time cadastrado ainda. Crie o primeiro time abaixo.
				</p>
			) : (
				<ul className="flex flex-col gap-2">
					{teams.map((team) => (
						<li key={team.id}>
							<form action={selectTeamAction.bind(null, team.id)}>
								<SubmitButton className="w-full rounded-lg border border-(--border) px-4 py-2 text-left hover:bg-black/5">
									{team.name}
								</SubmitButton>
							</form>
						</li>
					))}
				</ul>
			)}
			<form action={createTeamAction} className="flex flex-col gap-2">
				<input
					name="name"
					placeholder="Nome do time"
					className="rounded-lg border border-(--border) px-3 py-2"
					required
				/>
				<SubmitButton className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60">
					Criar time
				</SubmitButton>
			</form>
		</div>
	);
}
