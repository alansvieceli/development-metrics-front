import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

export default async function HomePage() {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	return (
		<main
			style={{
				display: "flex",
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<h1>Development Metrics</h1>
		</main>
	);
}
