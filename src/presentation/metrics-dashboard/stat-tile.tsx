import {
	Activity,
	CalendarDays,
	ClipboardCheck,
	Clock3,
	FlaskConical,
	Info,
	LockKeyhole,
	type LucideIcon,
	RefreshCcw,
	Rocket,
	Timer,
	TrendingUp,
	UsersRound,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { METRIC_DEFINITIONS, type MetricKey } from "./metric-definitions";

type StatTileProps = {
	metricKey: MetricKey;
	value: ReactNode;
	secondary?: ReactNode;
	detail?: ReactNode;
	detailIcon?: LucideIcon;
	featured?: boolean;
};

type MetricVisual = { color: string; icon: LucideIcon };

const METRIC_VISUALS: Partial<Record<MetricKey, MetricVisual>> = {
	wip: { color: "--accent", icon: Activity },
	blocked: { color: "--critical", icon: LockKeyhole },
	inReview: { color: "--chart-tertiary", icon: UsersRound },
	inTesting: { color: "--chart-quinary", icon: FlaskConical },
	inPublication: { color: "--accent", icon: Rocket },
	delivered: { color: "--accent", icon: ClipboardCheck },
	predictability: { color: "--accent", icon: TrendingUp },
	unplannedCount: { color: "--accent", icon: CalendarDays },
	reworkCount: { color: "--accent", icon: RefreshCcw },
	leadTime: { color: "--accent", icon: Timer },
	cycleTime: { color: "--chart-tertiary", icon: Timer },
	codeReviewTime: { color: "--accent", icon: Timer },
	testingTime: { color: "--chart-quinary", icon: Timer },
	blockedTime: { color: "--critical", icon: Timer },
	awaitingPublicationTime: { color: "--accent", icon: Timer },
};

export function StatTile({
	metricKey,
	value,
	secondary,
	detail,
	detailIcon: DetailIcon = Clock3,
	featured = false,
}: StatTileProps) {
	const definition = METRIC_DEFINITIONS.find((item) => item.key === metricKey);
	const visual = METRIC_VISUALS[metricKey] ?? {
		color: "--accent",
		icon: Activity,
	};
	const Icon = visual.icon;
	const color = `var(${visual.color})`;

	return (
		<div
			data-testid={`metric-tile-${metricKey}`}
			className={`flex h-full flex-col rounded-xl border p-4 ${featured ? "min-h-28" : "min-h-24"}`}
			style={{
				borderColor: `color-mix(in srgb, ${color} 45%, var(--border))`,
				background: `linear-gradient(135deg, color-mix(in srgb, ${color} 9%, var(--background)), var(--background) 70%)`,
			}}
		>
			<div className="flex flex-1 items-center gap-3">
				<span
					aria-hidden="true"
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
					style={
						{
							color,
							borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
							background: `color-mix(in srgb, ${color} 10%, transparent)`,
						} as CSSProperties
					}
				>
					<Icon size={20} strokeWidth={1.8} />
				</span>
				<div className="min-w-0 flex-1">
					<h3
						title={definition?.description}
						className="mb-1 flex cursor-help items-center gap-1 text-xs font-semibold tracking-[0.08em] text-(--foreground-muted) uppercase"
					>
						{definition?.label ?? metricKey}
						{definition?.description ? (
							<Info size={12} aria-hidden="true" className="opacity-60" />
						) : null}
					</h3>
					<p
						className={`font-mono font-semibold tracking-tight ${featured ? "text-3xl" : "text-2xl"}`}
					>
						{value}
						{secondary ? (
							<span className="ml-2 text-sm font-normal" style={{ color }}>
								{secondary}
							</span>
						) : null}
					</p>
				</div>
			</div>
			{detail ? (
				<div className="mt-3 flex items-center gap-2 border-t border-(--border) pt-3 text-xs text-(--foreground-muted)">
					<DetailIcon size={15} aria-hidden="true" style={{ color }} />
					<span>{detail}</span>
				</div>
			) : null}
		</div>
	);
}
