import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
	weight: ["500", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
	variable: "--font-ibm-plex-sans",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
});

export function RootShell({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="pt-BR"
			className={`${jetbrainsMono.variable} ${ibmPlexSans.variable}`}
		>
			<body>{children}</body>
		</html>
	);
}
