<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, onBeforeUnmount } from "vue";

import { formatDistance } from "date-fns";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { NewsModel } from "@musare_types/models/News";
import {
	NewsCreatedResponse,
	NewsUpdatedResponse,
	NewsRemovedResponse
} from "@musare_types/events/NewsEvents";
import { GetPublishedNewsResponse } from "@musare_types/actions/NewsActions";
import { useWebsocketStore } from "@/stores/websocket";
import { useNewsModelStore } from "@/stores/models/news";
import { useEvents } from "@/composables/useEvents";

const MainHeader = defineAsyncComponent(
	() => import("@/components/MainHeader.vue")
);
const MainFooter = defineAsyncComponent(
	() => import("@/components/MainFooter.vue")
);
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const { onReady, subscribe } = useEvents();
const { newest, registerModels, unregisterModels } = useNewsModelStore();

const news = ref<NewsModel[]>([]);

const { sanitize } = DOMPurify;

const onDeleted = async ({ oldDoc }) => {
	news.value.splice(
		news.value.findIndex(doc => doc._id === oldDoc._id),
		1
	);
};

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
		news.value = await newest();
	});

	await subscribe("model.news.created", async ({ doc }) => {
		news.value.unshift(...(await registerModels(doc)));
	});

	// TODO: Subscribe to loaded model updated/deleted events
	// socket.on("event:news.updated", (res: NewsUpdatedResponse) => {
	// 	if (res.data.news.status === "draft") {
	// 		news.value = news.value.filter(
	// 			item => item._id !== res.data.news._id
	// 		);
	// 		return;
	// 	}

	// 	for (let n = 0; n < news.value.length; n += 1) {
	// 		if (news.value[n]._id === res.data.news._id)
	// 			news.value[n] = {
	// 				...news.value[n],
	// 				...res.data.news
	// 			};
	// 	}
	// });

	// socket.on("event:news.deleted", (res: NewsRemovedResponse) => {
	// 	news.value = news.value.filter(item => item._id !== res.data.newsId);
	// });
});

onBeforeUnmount(async () => {
	await unregisterModels(news.value.map(model => model._id));
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
						By
						<user-link
							:user-id="item.createdBy"
							:alt="item.createdBy"
						/>&nbsp;<span
							:title="new Date(item.createdAt).toString()"
						>
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
