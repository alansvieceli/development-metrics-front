import { matchExternalStatus } from "@/application/task/match-external-status";
import type { ExternalCardProvider } from "@/application/task/ports/external-card-provider";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CardSyncResult =
	| { found: false }
	| {
			found: true;
			businessmapColumnLabel: string;
			businessmapStatus: TaskStatus | null;
			inSync: boolean;
	  };

export async function checkCardSync(
	provider: ExternalCardProvider,
	externalId: string,
	localStatus: TaskStatus,
): Promise<CardSyncResult> {
	const current = await provider.fetchCardColumn(externalId);
	if (!current) return { found: false };

	const businessmapStatus = matchExternalStatus(current.columnLabel);
	return {
		found: true,
		businessmapColumnLabel: current.columnLabel,
		businessmapStatus,
		inSync: businessmapStatus === localStatus,
	};
}
