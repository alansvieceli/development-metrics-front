type ExternalCardStep = {
	columnLabel: string;
	changedAt: Date;
};

export type ExternalCard = {
	externalId: string;
	description: string;
	ownerName: string | null;
	typeName: string | null;
	dueDate: string | null;
	blocked: boolean;
	steps: ExternalCardStep[];
};

export type ExternalCardProvider = {
	fetchCard(cardId: string): Promise<ExternalCard>;
	fetchCardColumn(cardId: string): Promise<{ columnLabel: string } | null>;
	listBoardCards(): Promise<{ externalId: string; columnLabel: string }[]>;
};
