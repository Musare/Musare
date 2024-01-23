<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted } from "vue";

import { formatDistance } from "date-fns";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { NewsModel } from "@musare_types/models/News";
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
const { onReady } = useEvents();
const { registerModels, onCreated, onDeleted } = useModels();

const news = ref<NewsModel[]>([]);

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

	await onReady(async () => {
		news.value = await registerModels(
			await runJob("data.news.newest", {}),
			{ news: "createdBy" }
		);
	});

	await onCreated("news", async ({ doc }) => {
		const [newDoc] = await registerModels(doc, { news: "createdBy" });
		news.value.unshift(newDoc);
	});

	await onDeleted("news", async ({ oldDoc }) => {
		const index = news.value.findIndex(doc => doc._id === oldDoc._id);

		if (index < 0) return;

		news.value.splice(index, 1);
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
					v-for="item in news"
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
