"use client";

import { useState } from "react";

type DeleteTeamButtonProps = {
	teamName: string;
	deleteTeamAction: () => Promise<void>;
};

export function DeleteTeamButton({
	teamName,
	deleteTeamAction,
}: DeleteTeamButtonProps) {
	const [pending, setPending] = useState(false);

	return (
		<button
			type="button"
			disabled={pending}
			onClick={async () => {
				const confirmed = window.confirm(
					`Excluir o time "${teamName}"? Essa ação remove também todos os membros e não pode ser desfeita.`,
				);
				if (!confirmed) {
					return;
				}
				setPending(true);
				await deleteTeamAction();
				// Navegação "dura" (fora do router do Next): o redirect() do Server
				// Action, ao cruzar de /teams/[teamId] para /teams (rotas irmãs
				// interceptadas pelo @modal), entra em loop de navegação no App
				// Router. Um reload completo evita o sistema de interceptação.
				window.location.href = "/teams";
			}}
			className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-60"
		>
			Excluir time
		</button>
	);
}
