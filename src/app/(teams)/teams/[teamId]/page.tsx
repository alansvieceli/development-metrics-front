import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

async function renameTeamAction(teamId: string, formData: FormData) {
	"use server";
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.renameTeam(teamId, name);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

async function deleteTeamAction(teamId: string) {
	"use server";
	const useCases = createTeamUseCases();
	await useCases.deleteTeam(teamId);
	revalidatePath("/teams");
	redirect("/teams");
}

async function addMemberAction(teamId: string, formData: FormData) {
	"use server";
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.addMember(teamId, name);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

async function renameMemberAction(
	teamId: string,
	memberId: string,
	formData: FormData,
) {
	"use server";
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.renameMember(memberId, name);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

async function removeMemberAction(teamId: string, memberId: string) {
	"use server";
	const useCases = createTeamUseCases();
	await useCases.removeMember(memberId);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

export default async function ManageTeamPage({
	params,
}: {
	params: Promise<{ teamId: string }>;
}) {
	const { teamId } = await params;
	const useCases = createTeamUseCases();
	const result = await useCases.getTeam(teamId);
	if (!result) {
		notFound();
	}
	const { team, members } = result;

	return (
		<main className="mx-auto flex max-w-md flex-col gap-6 p-6">
			<h1 className="text-xl font-semibold">Gerenciar time</h1>
			<form
				action={renameTeamAction.bind(null, teamId)}
				className="flex flex-col gap-2"
			>
				<label htmlFor="team-name">Nome do time</label>
				<input
					id="team-name"
					name="name"
					defaultValue={team.name}
					className="rounded border px-3 py-2"
					required
				/>
				<button type="submit" className="self-start rounded border px-4 py-2">
					Salvar nome
				</button>
			</form>

			<div className="flex flex-col gap-2">
				<p>Membros</p>
				{members.map((member) => (
					<div
						key={member.id}
						className="flex items-center justify-between gap-2"
					>
						<form
							action={renameMemberAction.bind(null, teamId, member.id)}
							className="flex flex-1 gap-2"
						>
							<input
								name="name"
								defaultValue={member.name}
								className="flex-1 rounded border px-2 py-1"
								required
							/>
							<button type="submit" className="rounded border px-2 py-1">
								Renomear
							</button>
						</form>
						<form action={removeMemberAction.bind(null, teamId, member.id)}>
							<button type="submit" className="rounded border px-2 py-1">
								Remover
							</button>
						</form>
					</div>
				))}
			</div>

			<form
				action={addMemberAction.bind(null, teamId)}
				className="flex flex-col gap-2"
			>
				<input
					name="name"
					placeholder="Nome do novo membro"
					className="rounded border px-3 py-2"
					required
				/>
				<button type="submit" className="self-start rounded border px-4 py-2">
					+ Adicionar membro
				</button>
			</form>

			<hr />
			<form action={deleteTeamAction.bind(null, teamId)}>
				<button
					type="submit"
					className="rounded bg-red-700 px-4 py-2 text-white"
				>
					Excluir time
				</button>
			</form>
		</main>
	);
}
