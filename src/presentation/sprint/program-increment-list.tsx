import type { ActionState } from "@/application/shared/action-state";
import type { ProgramIncrement } from "@/domain/sprint/entities/program-increment";
import type { Sprint } from "@/domain/sprint/entities/sprint";
import { SprintForm } from "@/presentation/sprint/sprint-form";

type ProgramIncrementListProps = {
	programIncrements: { pi: ProgramIncrement; sprints: Sprint[] }[];
	createSprintAction: (
		piId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

export function ProgramIncrementList({
	programIncrements,
	createSprintAction,
}: ProgramIncrementListProps) {
	if (programIncrements.length === 0) {
		return <p className="text-sm opacity-70">Nenhum PI cadastrado ainda.</p>;
	}

	return (
		<ul className="flex flex-col gap-6">
			{programIncrements.map(({ pi, sprints }) => (
				<li
					key={pi.id}
					className="flex flex-col gap-3 rounded-lg border border-(--border) p-4"
				>
					<div>
						<p className="font-semibold">{pi.name}</p>
						<p className="text-xs opacity-70">
							{pi.startDate} até {pi.endDate}
						</p>
					</div>
					{sprints.length > 0 ? (
						<ul className="flex flex-col gap-1 text-sm">
							{sprints.map((sprint) => (
								<li key={sprint.id} className="flex items-center gap-2">
									<span
										aria-hidden="true"
										className={`h-1.5 w-1.5 rounded-full ${
											sprint.status === "ACTIVE"
												? "bg-(--accent)"
												: sprint.status === "CLOSED"
													? "bg-(--foreground-muted)"
													: "bg-transparent border border-(--border)"
										}`}
									/>
									{sprint.name} · {sprint.startDate} até {sprint.endDate}
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm opacity-70">Nenhuma sprint cadastrada.</p>
					)}
					<SprintForm piId={pi.id} createSprintAction={createSprintAction} />
				</li>
			))}
		</ul>
	);
}
