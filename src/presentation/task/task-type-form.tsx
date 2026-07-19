"use client";

import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import { SubmitButton } from "@/presentation/shared/submit-button";

type TaskTypeFormProps = {
	createTaskTypeAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

export function TaskTypeForm({ createTaskTypeAction }: TaskTypeFormProps) {
	const [state, action] = useActionState(
		createTaskTypeAction,
		INITIAL_ACTION_STATE,
	);
	return (
		<form action={action} className="flex flex-col gap-2">
			<p className="text-sm opacity-70">Novo tipo</p>
			<div className="flex items-center gap-2">
				<input
					type="color"
					name="color"
					defaultValue="#2563eb"
					className="h-9 w-9 shrink-0 rounded border border-(--border)"
				/>
				<input
					name="name"
					placeholder="Nome do tipo"
					className="flex-1 rounded-lg border border-(--border) px-3 py-2"
					required
				/>
			</div>
			{state.error ? <p role="alert">{state.error}</p> : null}
			<SubmitButton className="self-start rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60">
				Adicionar tipo
			</SubmitButton>
		</form>
	);
}
