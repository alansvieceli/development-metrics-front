"use client";

import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import { SubmitButton } from "@/presentation/shared/submit-button";

type SprintFormProps = {
	piId: string;
	createSprintAction: (
		piId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

export function SprintForm({ piId, createSprintAction }: SprintFormProps) {
	const [state, action] = useActionState(
		createSprintAction.bind(null, piId),
		INITIAL_ACTION_STATE,
	);
	return (
		<form action={action} className="flex flex-wrap items-center gap-2">
			<input
				name="name"
				placeholder="Nome da sprint (ex: Sprint 1)"
				className="flex-1 rounded-lg border border-(--border) px-2 py-1 text-sm"
				required
			/>
			<input
				type="date"
				name="startDate"
				className="rounded-lg border border-(--border) px-2 py-1 text-sm"
				required
			/>
			<input
				type="date"
				name="endDate"
				className="rounded-lg border border-(--border) px-2 py-1 text-sm"
				required
			/>
			<SubmitButton className="rounded-lg border border-(--border) px-3 py-1 text-sm disabled:opacity-60">
				Adicionar sprint
			</SubmitButton>
			{state.error ? <p role="alert" className="w-full text-sm">{state.error}</p> : null}
		</form>
	);
}
