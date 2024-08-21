<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, computed } from "vue";

import { formatDistance } from "date-fns";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { NewsModel } from "@musare_types/models/News";
import { forEachIn } from "@common/utils/forEachIn";
import { useEvents } from "@/composables/useEvents";
import { useModels } from "@/composables/useModels";
import { useWebsocketStore } from "@/stores/websocket";

const MainHeader = defineAsyncComponent(
	() => import("@/components/MainHeader.vue")
);
const MainFooter = defineAsyncComponent(
	() => import("@/components/MainFooter.vue")
);

const { runJob } = useWebsocketStore();
const { onReady, subscribe } = useEvents();
const { registerModel, registerModels } = useModels();

const news = ref<NewsModel[]>([]);

const sortedNews = computed(() =>
	news.value.toSorted(
		(newsA, newsB) =>
			new Date(newsB.createdAt).getTime() -
			new Date(newsA.createdAt).getTime()
	)
);

const { sanitize } = DOMPurify;

onMounted(async () => {
	marked.use({
		renderer: {
			table(header, body) {
				return `<table class="table">
					<thead>${header}</thead>
					<tbody>${body}</tbody>
					</table>`;
			}
		}
	});

	const addNews = async models => {
		await forEachIn(models, async model => {
			await subscribe(
				`data.news.unpublished:${model._id}`,
				async ({ oldDoc }) => {
					const index = news.value.findIndex(
						doc => doc._id === oldDoc._id
					);

					if (index < 0) return;

					news.value.splice(index, 1);
				}
			);
			news.value.push(model);
		});
	};

	await onReady(async () => {
		const docs = await runJob("data.news.newest", {});
		const models = await registerModels(docs, { news: "createdBy" });
		await addNews(models);
	});

	await subscribe("data.news.published", async ({ doc }) => {
		const model = await registerModel(doc, { news: "createdBy" });
		await addNews([model]);
	});
});
</script>

<template>
	<div class="app">
		<page-metadata title="News" />
		<main-header />
		<div class="container">
			<div class="content-wrapper">
				<h1 class="has-text-centered page-title">News</h1>
				<div
					v-for="item in sortedNews"
					:key="item._id"
					class="section news-item"
				>
					<div v-html="sanitize(marked(item.markdown))"></div>
					<div class="info">
						<hr />
						By&nbsp;
						<router-link
							:to="{ path: `/u/${item.createdBy.username}` }"
							:title="item.createdBy._id"
						>
							{{ item.createdBy.name }} </router-link
						>&nbsp;
						<span :title="new Date(item.createdAt).toString()">
							{{
								formatDistance(
									new Date(item.createdAt),
									new Date(),
									{
										addSuffix: true
									}
								)
							}}
						</span>
					</div>
				</div>
				<h3 v-if="news.length === 0" class="has-text-centered">
					No news items were found.
				</h3>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	p {
		color: var(--light-grey-2);
	}
}

.container {
	width: calc(100% - 32px);
}

.section {
	border: 1px solid var(--light-grey-3);
	max-width: 100%;
	margin-top: 50px;

	&:last-of-type {
		margin-bottom: 50px;
	}
}
</style>
