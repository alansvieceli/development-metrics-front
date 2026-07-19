export const DEFAULT_WIP_LIMIT = 6;
export const DEFAULT_COMPLETED_TASK_LIMIT = 10;

export type Team = {
	id: string;
	name: string;
	wipLimit: number;
	completedTaskLimit: number;
};

export function isValidWipLimit(value: number): boolean {
	return Number.isInteger(value) && value > 0;
}
