import { defineStore } from "pinia";
import { useWebsocketStore } from "../websocket";
import { createModelStore } from "./model";

export const useNewsModelStore = defineStore("newsModel", () => {
	const { runJob } = useWebsocketStore();

	const modelStore = createModelStore("news");

	const published = async () => runJob("data.news.published", {});

	const newest = async (showToNewUsers?) => {
		const data = await runJob("data.news.newest", { showToNewUsers });

		return modelStore.registerModels(data);
	};

	return {
		...modelStore,
		published,
		newest
	};
});
