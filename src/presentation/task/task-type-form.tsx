import { SubmitButton } from "@/presentation/shared/submit-button";

type TaskTypeFormProps = {
	createTaskTypeAction: (formData: FormData) => void | Promise<void>;
};

export function TaskTypeForm({ createTaskTypeAction }: TaskTypeFormProps) {
	return (
		<form action={createTaskTypeAction} className="flex flex-col gap-2">
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
			<SubmitButton className="self-start rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60">
				Adicionar tipo
			</SubmitButton>
		</form>
	);
}
