import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { selectTeamAction } from "@/app/actions";
import { createTeamUseCases } from "@/composition/team";
import { RootShell } from "@/presentation/shared/root-shell";
import { TeamSwitcher } from "@/presentation/team/team-switcher";

export const metadata: Metadata = {
	title: "Development Metrics",
	description: "Development Metrics",
};

export default async function RootLayout({
	children,
	modal,
}: {
	children: ReactNode;
	modal: ReactNode;
}) {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	const teams = currentTeam ? await useCases.listTeams() : [];

	return (
		<RootShell>
			<header className="flex items-center justify-between bg-(--header-bg) px-6 py-4">
				<span className="font-semibold text-(--header-fg)">
					Development Metrics
				</span>
				{currentTeam ? (
					<div className="flex items-center gap-4">
						<nav className="flex items-center gap-4">
							<Link
								href="/board"
								className="text-sm text-(--header-fg) hover:underline"
							>
								Quadro
							</Link>
							<Link
								href="/metrics"
								className="text-sm text-(--header-fg) hover:underline"
							>
								Métricas
							</Link>
						</nav>
						<Link
							href="/task-types"
							className="text-sm text-(--header-fg) hover:underline"
						>
							Tipos de task
						</Link>
						<TeamSwitcher
							currentTeam={currentTeam}
							teams={teams}
							selectTeamAction={selectTeamAction}
						/>
					</div>
				) : null}
			</header>
			{children}
			{modal}
		</RootShell>
	);
}
