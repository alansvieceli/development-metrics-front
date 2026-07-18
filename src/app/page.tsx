import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

export default async function HomePage() {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}
	redirect("/board");
}
