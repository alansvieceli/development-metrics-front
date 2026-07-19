export const DEFAULT_WIP_LIMIT = 6;

export type Team = {
	id: string;
	name: string;
	wipLimit: number;
};

export function isValidWipLimit(value: number): boolean {
	return Number.isInteger(value) && value > 0;
}
