"use client";

import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import { SubmitButton } from "@/presentation/shared/submit-button";

type ProgramIncrementFormProps = {
	createProgramIncrementAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

export function ProgramIncrementForm({
	createProgramIncrementAction,
}: ProgramIncrementFormProps) {
	const [state, action] = useActionState(
		createProgramIncrementAction,
		INITIAL_ACTION_STATE,
	);
	return (
		<form action={action} className="flex flex-col gap-2 border-t border-(--border) pt-4">
			<p className="text-sm opacity-70">Novo PI</p>
			<input
				name="name"
				placeholder="Nome do PI (ex: PI 2026.3)"
				className="rounded-lg border border-(--border) px-3 py-2"
				required
			/>
			<div className="flex items-center gap-2">
				<input
					type="date"
					name="startDate"
					className="flex-1 rounded-lg border border-(--border) px-3 py-2"
					required
				/>
				<span className="opacity-60">até</span>
				<input
					type="date"
					name="endDate"
					className="flex-1 rounded-lg border border-(--border) px-3 py-2"
					required
				/>
			</div>
			{state.error ? <p role="alert">{state.error}</p> : null}
			<SubmitButton className="self-start rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60">
				Adicionar PI
			</SubmitButton>
		</form>
	);
}
