import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
	MetricsQueryPort,
} from "@/application/metrics/ports/metrics-query-port";

export type FakeMetricsQueryPort = MetricsQueryPort & {
	completedTasks: CompletedTaskMetrics[];
	dueDateTasks: DueDateTaskMetrics[];
	wip: number;
};

export function createFakeMetricsQueryPort(): FakeMetricsQueryPort {
	const state: FakeMetricsQueryPort = {
		completedTasks: [],
		dueDateTasks: [],
		wip: 0,
		async listCompletedTasksInPeriod() {
			return state.completedTasks;
		},
		async listTasksWithDueDateInPeriod() {
			return state.dueDateTasks;
		},
		async countWip() {
			return state.wip;
		},
	};
	return state;
}
