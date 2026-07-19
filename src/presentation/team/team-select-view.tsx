"use client";

import { useActionState, useState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import type { Team } from "@/domain/team/entities/team";
import { SubmitButton } from "@/presentation/shared/submit-button";

type TeamSelectViewProps = {
	teams: Team[];
	createTeamAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	selectTeamAction: (teamId: string) => Promise<ActionState>;
};

export function TeamSelectView({
	teams,
	createTeamAction,
	selectTeamAction,
}: TeamSelectViewProps) {
	const [createState, createAction] = useActionState(
		createTeamAction,
		INITIAL_ACTION_STATE,
	);
	const [selectError, setSelectError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function select(teamId: string) {
		setPending(true);
		setSelectError(null);
		try {
			const result = await selectTeamAction(teamId);
			if (result.error) setSelectError(result.error);
		} catch {
			setSelectError("Não foi possível concluir a operação");
		} finally {
			setPending(false);
		}
	}

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
							<button
								type="button"
								disabled={pending}
								onClick={() => select(team.id)}
								className="w-full rounded-lg border border-(--border) px-4 py-2 text-left hover:bg-black/5 disabled:opacity-60"
							>
								{team.name}
							</button>
						</li>
					))}
				</ul>
			)}
			{selectError ? <p role="alert">{selectError}</p> : null}
			<form action={createAction} className="flex flex-col gap-2">
				<input
					name="name"
					placeholder="Nome do time"
					className="rounded-lg border border-(--border) px-3 py-2"
					required
				/>
				{createState.error ? <p role="alert">{createState.error}</p> : null}
				<SubmitButton className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60">
					Criar time
				</SubmitButton>
			</form>
		</div>
	);
}
