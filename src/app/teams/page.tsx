import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

async function createTeamAction(formData: FormData) {
	"use server";
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.createTeam(name);
	revalidatePath("/teams");
	redirect("/teams");
}

async function selectTeamAction(formData: FormData) {
	"use server";
	const teamId = String(formData.get("teamId") ?? "");
	const useCases = createTeamUseCases();
	await useCases.selectTeam(teamId);
	revalidatePath("/");
	redirect("/");
}

export default async function TeamsPage() {
	const useCases = createTeamUseCases();
	const teams = await useCases.listTeams();

	return (
		<main className="mx-auto flex max-w-md flex-col gap-6 p-6">
			<h1 className="text-xl font-semibold">Selecionar time</h1>
			{teams.length === 0 ? (
				<p>Nenhum time cadastrado ainda. Crie o primeiro time abaixo.</p>
			) : (
				<ul className="flex flex-col gap-2">
					{teams.map((team) => (
						<li key={team.id}>
							<form action={selectTeamAction}>
								<input type="hidden" name="teamId" value={team.id} />
								<button
									type="submit"
									className="w-full rounded border px-4 py-2 text-left"
								>
									{team.name}
								</button>
							</form>
						</li>
					))}
				</ul>
			)}
			<form action={createTeamAction} className="flex flex-col gap-2">
				<input
					name="name"
					placeholder="Nome do time"
					className="rounded border px-3 py-2"
					required
				/>
				<button
					type="submit"
					className="rounded bg-[var(--foreground)] px-4 py-2 text-[var(--background)]"
				>
					Criar time
				</button>
			</form>
		</main>
	);
}
