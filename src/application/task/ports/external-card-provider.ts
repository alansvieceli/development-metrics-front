export type ExternalCardStep = {
	columnLabel: string;
	changedAt: Date;
};

export type ExternalCard = {
	externalId: string;
	description: string;
	ownerName: string | null;
	dueDate: string | null;
	steps: ExternalCardStep[];
};

export type ExternalCardProvider = {
	fetchCard(cardId: string): Promise<ExternalCard>;
};
