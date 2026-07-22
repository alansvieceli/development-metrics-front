export type TaskType = {
	id: string;
	name: string;
	color: string;
	isBug: boolean;
};

export function isBugTypeName(name: string): boolean {
	return name.trim().toLowerCase() === "bug";
}
