import type {
	ExternalCard,
	ExternalCardProvider,
} from "@/application/task/ports/external-card-provider";

type BusinessmapCard = {
	card_id: number;
	board_id: number;
	column_id: number;
	type_id: number;
	description: string;
	deadline: string | null;
	owner_user_id: number | null;
	is_blocked: number;
	created_at: string;
};

type BusinessmapRevision = {
	revision: number;
	user_id: number;
	replaced_at: string;
};
type BusinessmapColumn = {
	column_id: number;
	parent_column_id: number | null;
	name: string;
};
type BusinessmapCardType = { type_id: number; name: string };
type BusinessmapUser = { username: string };

function baseUrl(): string {
	const companyName = process.env.BUSINESSMAP_COMPANY_NAME;
	if (!companyName) {
		throw new Error("BUSINESSMAP_COMPANY_NAME não configurado");
	}
	return `https://${companyName}.kanbanize.com/api/v2`;
}

function authHeaders(): HeadersInit {
	const apiKey = process.env.BUSINESSMAP_API_KEY;
	if (!apiKey) {
		throw new Error("BUSINESSMAP_API_KEY não configurado");
	}
	return { apikey: apiKey };
}

async function getJson<T>(url: string, headers: HeadersInit): Promise<T> {
	const response = await fetch(url, { headers });
	if (!response.ok) {
		throw new Error(
			`Businessmap respondeu ${response.status} ao chamar ${url}`,
		);
	}
	const body = (await response.json()) as { data: T };
	return body.data;
}

function columnLabel(
	columnId: number,
	columnsById: Map<number, BusinessmapColumn>,
): string {
	const column = columnsById.get(columnId);
	if (!column) return `column-${columnId}`;
	const parent = column.parent_column_id
		? columnsById.get(column.parent_column_id)
		: null;
	return parent ? `${parent.name}.${column.name}` : column.name;
}

async function fetchColumnsById(
	boardId: number,
	headers: HeadersInit,
	url: string,
): Promise<Map<number, BusinessmapColumn>> {
	const columns = await getJson<BusinessmapColumn[]>(
		`${url}/boards/${boardId}/columns`,
		headers,
	);
	return new Map(columns.map((column) => [column.column_id, column]));
}

export const businessmapCardProvider: ExternalCardProvider = {
	async fetchCard(cardId: string): Promise<ExternalCard> {
		const headers = authHeaders();
		const url = baseUrl();

		const card = await getJson<BusinessmapCard>(
			`${url}/cards/${cardId}`,
			headers,
		);
		const columnsById = await fetchColumnsById(card.board_id, headers, url);

		const revisions = await getJson<BusinessmapRevision[]>(
			`${url}/cards/${cardId}/revisions`,
			headers,
		);
		const snapshots: number[] = [];
		for (const revision of revisions) {
			const snapshot = await getJson<BusinessmapCard>(
				`${url}/cards/${cardId}/revisions/${revision.revision}`,
				headers,
			);
			snapshots.push(snapshot.column_id);
		}

		const steps: { columnLabel: string; changedAt: Date }[] = [];
		if (snapshots.length > 0) {
			steps.push({
				columnLabel: columnLabel(snapshots[0], columnsById),
				changedAt: new Date(card.created_at),
			});
			for (let i = 0; i < snapshots.length - 1; i++) {
				if (snapshots[i] !== snapshots[i + 1]) {
					steps.push({
						columnLabel: columnLabel(snapshots[i + 1], columnsById),
						changedAt: new Date(revisions[i].replaced_at),
					});
				}
			}
			const lastSnapshot = snapshots[snapshots.length - 1];
			if (lastSnapshot !== card.column_id) {
				steps.push({
					columnLabel: columnLabel(card.column_id, columnsById),
					changedAt: new Date(revisions[revisions.length - 1].replaced_at),
				});
			}
		} else {
			steps.push({
				columnLabel: columnLabel(card.column_id, columnsById),
				changedAt: new Date(card.created_at),
			});
		}

		let ownerName: string | null = null;
		if (card.owner_user_id) {
			const owner = await getJson<BusinessmapUser>(
				`${url}/users/${card.owner_user_id}`,
				headers,
			);
			ownerName = owner.username;
		}

		const cardTypes = await getJson<BusinessmapCardType[]>(
			`${url}/cardTypes`,
			headers,
		);
		const typeName =
			cardTypes.find((type) => type.type_id === card.type_id)?.name ?? null;

		return {
			externalId: String(card.card_id),
			description: card.description,
			ownerName,
			typeName,
			dueDate: card.deadline ? card.deadline.slice(0, 10) : null,
			blocked: Boolean(card.is_blocked),
			steps,
		};
	},
	async fetchCardColumn(
		cardId: string,
	): Promise<{ columnLabel: string } | null> {
		const headers = authHeaders();
		const url = baseUrl();
		const response = await fetch(`${url}/cards/${cardId}`, { headers });
		if (response.status === 404) return null;
		if (!response.ok) {
			throw new Error(
				`Businessmap respondeu ${response.status} ao chamar ${url}/cards/${cardId}`,
			);
		}
		const body = (await response.json()) as { data: BusinessmapCard };
		const card = body.data;
		const columnsById = await fetchColumnsById(card.board_id, headers, url);
		return { columnLabel: columnLabel(card.column_id, columnsById) };
	},
};
