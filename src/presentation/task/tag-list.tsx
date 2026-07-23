"use client";

import { Check, Trash2 } from "lucide-react";
import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import type { TagWithUsage } from "@/application/task/use-cases/list-tags";
import { SubmitButton } from "@/presentation/shared/submit-button";

type TagListProps = {
	tags: TagWithUsage[];
	updateTagAction: (
		tagId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	deleteTagAction: (
		tagId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

function TagRow({
	tag,
	updateTagAction,
	deleteTagAction,
}: {
	tag: TagWithUsage;
	updateTagAction: TagListProps["updateTagAction"];
	deleteTagAction: TagListProps["deleteTagAction"];
}) {
	const [updateState, updateAction] = useActionState(
		updateTagAction.bind(null, tag.id),
		INITIAL_ACTION_STATE,
	);
	const [deleteState, deleteAction] = useActionState(
		deleteTagAction.bind(null, tag.id),
		INITIAL_ACTION_STATE,
	);

	return (
		<li className="flex flex-col gap-1">
			<div className="flex items-center gap-2">
				<form action={updateAction} className="flex flex-1 items-center gap-2">
					<input
						type="color"
						name="color"
						defaultValue={tag.color}
						className="h-9 w-9 shrink-0 rounded border border-(--border)"
					/>
					<input
						name="name"
						defaultValue={tag.name}
						className="flex-1 rounded-lg border border-(--border) px-2 py-1"
						required
					/>
					<SubmitButton
						aria-label="Salvar tarja"
						className="rounded-lg border border-(--border) p-1.5 disabled:opacity-60"
					>
						<Check size={14} aria-hidden="true" />
					</SubmitButton>
				</form>
				<form action={deleteAction}>
					<SubmitButton
						aria-label="Excluir tarja"
						disabled={tag.inUse}
						title={
							tag.inUse
								? "Não é possível excluir: há tasks vinculadas a esta tarja"
								: undefined
						}
						confirmMessage={`Excluir a tarja ${tag.name}?`}
						className="rounded-lg border border-(--border) p-1.5 disabled:opacity-40"
					>
						<Trash2 size={14} aria-hidden="true" />
					</SubmitButton>
				</form>
			</div>
			{updateState.error ? <p role="alert">{updateState.error}</p> : null}
			{deleteState.error ? <p role="alert">{deleteState.error}</p> : null}
		</li>
	);
}

export function TagList(props: TagListProps) {
	if (props.tags.length === 0) {
		return (
			<p className="text-sm opacity-70">Nenhuma tarja cadastrada ainda.</p>
		);
	}

	return (
		<ul className="flex flex-col gap-2">
			{props.tags.map((tag) => (
				<TagRow
					key={tag.id}
					tag={tag}
					updateTagAction={props.updateTagAction}
					deleteTagAction={props.deleteTagAction}
				/>
			))}
		</ul>
	);
}
