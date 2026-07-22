import packageJson from "../../../package.json";

export function Footer() {
	return (
		<footer className="flex items-center justify-between border-t border-(--border) px-6 py-3 font-mono text-xs text-(--foreground-muted)">
			<span>DEV·METRICS</span>
			<span>v{packageJson.version}</span>
		</footer>
	);
}
