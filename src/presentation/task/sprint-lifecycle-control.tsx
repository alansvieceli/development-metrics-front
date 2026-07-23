"use client";

import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import type { Sprint } from "@/domain/sprint/entities/sprint";
import { SubmitButton } from "@/presentation/shared/submit-button";

type SprintLifecycleControlProps = {
	activeSprint: Sprint | undefined;
	hasPlannedSprint: boolean;
	startSprintAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	finishSprintAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

export function SprintLifecycleControl({
	activeSprint,
	hasPlannedSprint,
	startSprintAction,
	finishSprintAction,
}: SprintLifecycleControlProps) {
	const [state, action] = useActionState(
		activeSprint ? finishSprintAction : startSprintAction,
		INITIAL_ACTION_STATE,
	);

	if (!activeSprint && !hasPlannedSprint) return null;

	return (
		<form action={action} className="flex items-center gap-2">
			{activeSprint ? (
				<>
					<span className="text-sm opacity-70">
						{activeSprint.name} · {activeSprint.startDate} até{" "}
						{activeSprint.endDate}
					</span>
					<input type="hidden" name="sprintId" value={activeSprint.id} />
					<SubmitButton
						confirmMessage="Finalizar a sprint atual? Tasks não concluídas serão transbordadas para a próxima sprint planejada."
						className="rounded-lg border border-(--border) px-3 py-1.5 text-sm disabled:opacity-60"
					>
						Finalizar sprint
					</SubmitButton>
				</>
			) : (
				<SubmitButton className="rounded-lg border border-(--border) px-3 py-1.5 text-sm disabled:opacity-60">
					Iniciar sprint
				</SubmitButton>
			)}
			{state.error ? (
				<p role="alert" className="text-sm">
					{state.error}
				</p>
			) : null}
		</form>
	);
}
