import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";
import { RootShell } from "@/presentation/shared/root-shell";

export const metadata: Metadata = {
	title: "Development Metrics",
	description: "Development Metrics",
};

export default async function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	return (
		<RootShell>
			<header className="flex items-center justify-between border-b px-6 py-4">
				<span className="font-semibold">Development Metrics</span>
			</header>
			{children}
		</RootShell>
	);
}
