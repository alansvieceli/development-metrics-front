ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check" CHECK ("status" IN ('TODO','IN_DEVELOPMENT','CODE_REVIEW','DONE'));
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_from_status_check" CHECK ("from_status" IS NULL OR "from_status" IN ('TODO','IN_DEVELOPMENT','CODE_REVIEW','DONE'));
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_to_status_check" CHECK ("to_status" IN ('TODO','IN_DEVELOPMENT','CODE_REVIEW','DONE'));
