import { defineStore } from "pinia";
import { useWebsocketStore } from "../websocket";
import { createModelStore } from "./model";

export const useNewsModelStore = defineStore("newsModel", () => {
	const { runJob } = useWebsocketStore();

	const modelStore = createModelStore("news");

	const published = async () => runJob("data.news.published", {});

	const newest = async (showToNewUsers?, limit?) =>
		runJob("data.news.newest", { showToNewUsers, limit });

	return {
		...modelStore,
		published,
		newest
	};
});
