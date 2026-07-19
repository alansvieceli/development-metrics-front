"use client";

import { useState } from "react";
import type { ActionState } from "@/application/shared/action-state";

type DeleteTeamButtonProps = {
	teamName: string;
	deleteTeamAction: () => Promise<ActionState>;
};

export function DeleteTeamButton({
	teamName,
	deleteTeamAction,
}: DeleteTeamButtonProps) {
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	return (
		<div className="flex flex-col gap-2">
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
					setError(null);
					try {
						const result = await deleteTeamAction();
						if (result.error) {
							setError(result.error);
							return;
						}
						window.location.href = "/teams";
					} catch {
						setError("Não foi possível concluir a operação");
					} finally {
						setPending(false);
					}
				}}
				className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-60"
			>
				Excluir time
			</button>
			{error ? <p role="alert">{error}</p> : null}
		</div>
	);
}
