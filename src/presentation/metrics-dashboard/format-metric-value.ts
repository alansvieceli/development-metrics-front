export function formatDuration(ms: number): string {
	const totalMinutes = Math.round(ms / 60_000);
	if (totalMinutes < 60) {
		return `${totalMinutes}min`;
	}
	const totalHours = Math.round(ms / 3_600_000);
	if (totalHours < 24) {
		return `${totalHours}h`;
	}
	const days = Math.floor(ms / 86_400_000);
	const hours = Math.round((ms % 86_400_000) / 3_600_000);
	return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export function formatPercent(value: number): string {
	return `${Math.round(value)}%`;
}
