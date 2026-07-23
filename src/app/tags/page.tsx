import { redirect } from "next/navigation";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { TagForm } from "@/presentation/task/tag-form";
import { TagList } from "@/presentation/task/tag-list";
import { createTagAction, deleteTagAction, updateTagAction } from "./actions";

export default async function TagsPage() {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const taskUseCases = createTaskUseCases();
	const tags = await taskUseCases.listTags();

	return (
		<main className="mx-auto flex max-w-md flex-col gap-6 p-6">
			<h1 className="text-xl font-semibold">Tarjas</h1>
			<TagList
				tags={tags}
				updateTagAction={updateTagAction}
				deleteTagAction={deleteTagAction}
			/>
			<TagForm createTagAction={createTagAction} />
		</main>
	);
}
