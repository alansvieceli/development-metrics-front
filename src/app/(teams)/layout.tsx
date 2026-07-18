import type { Metadata } from "next";
import { RootShell } from "@/presentation/shared/root-shell";

export const metadata: Metadata = {
	title: "Development Metrics",
	description: "Development Metrics",
};

export default function TeamsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <RootShell>{children}</RootShell>;
}
