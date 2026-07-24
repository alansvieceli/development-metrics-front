import type {
	ExternalCard,
	ExternalCardProvider,
} from "@/application/task/ports/external-card-provider";

export type FakeExternalCardProvider = ExternalCardProvider & {
	seed(cardId: string, card: ExternalCard): void;
	seedColumn(cardId: string, column: { columnLabel: string }): void;
};

export function createFakeExternalCardProvider(): FakeExternalCardProvider {
	const cards = new Map<string, ExternalCard>();
	const columns = new Map<string, { columnLabel: string }>();
	return {
		seed(cardId, card) {
			cards.set(cardId, card);
		},
		seedColumn(cardId, column) {
			columns.set(cardId, column);
		},
		async fetchCard(cardId) {
			const card = cards.get(cardId);
			if (!card)
				throw new Error(`Card ${cardId} não encontrado no fake provider`);
			return card;
		},
		async fetchCardColumn(cardId) {
			return columns.get(cardId) ?? null;
		},
	};
}
