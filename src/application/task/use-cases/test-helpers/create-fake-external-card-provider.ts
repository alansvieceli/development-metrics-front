import type {
	ExternalCard,
	ExternalCardProvider,
} from "@/application/task/ports/external-card-provider";

export type FakeExternalCardProvider = ExternalCardProvider & {
	seed(cardId: string, card: ExternalCard): void;
};

export function createFakeExternalCardProvider(): FakeExternalCardProvider {
	const cards = new Map<string, ExternalCard>();
	return {
		seed(cardId, card) {
			cards.set(cardId, card);
		},
		async fetchCard(cardId) {
			const card = cards.get(cardId);
			if (!card) throw new Error(`Card ${cardId} não encontrado no fake provider`);
			return card;
		},
	};
}
