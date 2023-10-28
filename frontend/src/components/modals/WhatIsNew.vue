<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from "vue";
import { formatDistance } from "date-fns";
import { marked } from "marked";
import dompurify from "dompurify";
import { useModels } from "@/composables/useModels";
import { useModalsStore } from "@/stores/modals";
import { useWebsocketStore } from "@/stores/websocket";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));

defineProps({
	modalUuid: { type: String, required: true }
});

const { runJob } = useWebsocketStore();

const { registerModels, onDeleted } = useModels();

const { closeCurrentModal } = useModalsStore();

const news = ref();

onMounted(async () => {
	let firstVisited = localStorage.getItem("firstVisited");

	const newUser = !firstVisited;

	const [model] = await runJob("data.news.newest", {
		showToNewUsers: newUser,
		limit: 1
	});

	if (model && newUser) {
		firstVisited = Date.now().toString();

		localStorage.setItem("firstVisited", firstVisited);
	} else if (
		!model ||
		(localStorage.getItem("whatIsNew") &&
			parseInt(localStorage.getItem("whatIsNew") as string) >=
				Date.parse(model.createdAt)) ||
		parseInt(firstVisited as string) >= model.createdAt
	) {
		closeCurrentModal(true);
		return;
	}

	localStorage.setItem("whatIsNew", Date.parse(model.createdAt).toString());

	const [_model] = await registerModels(model, { news: "createdBy" });

	news.value = _model;

	await onDeleted("news", ({ oldDoc }) => {
		if (oldDoc._id === news.value?._id) closeCurrentModal(true);
	});

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
});

const { sanitize } = dompurify;
</script>

<template>
	<modal v-if="news" title="News" class="what-is-news-modal">
		<template #body>
			<div
				class="section news-item"
				v-html="sanitize(marked(news.markdown))"
			></div>
		</template>
		<template #footer>
			<span v-if="news.createdBy">
				By&nbsp;
				<router-link
					:to="{ path: `/u/${news.createdBy.username}` }"
					:title="news.createdBy._id"
				>
					{{ news.createdBy.name }}
				</router-link> </span
			>&nbsp;
			<span :title="new Date(news.createdAt).toString()">
				{{
					formatDistance(new Date(news.createdAt), new Date(), {
						addSuffix: true
					})
				}}
			</span>
		</template>
	</modal>
</template>

<style lang="less">
.what-is-news-modal .modal-card .modal-card-foot {
	column-gap: 0;
}
</style>

<style lang="less" scoped>
.night-mode {
	.modal-card,
	.modal-card-head,
	.modal-card-body {
		background-color: var(--dark-grey-3);
	}

	strong,
	p {
		color: var(--light-grey-2);
	}

	.section {
		background-color: transparent !important;
	}
}

.modal-card-head {
	border-bottom: none;
	background-color: ghostwhite;
	padding: 15px;
}

.modal-card-title {
	font-size: 14px;
}

.news-item {
	box-shadow: unset !important;
}

.delete {
	background: transparent;
	&:hover {
		background: transparent;
	}

	&:before,
	&:after {
		background-color: var(--light-grey-3);
	}
}

.sect {
	div[class^="sect-head"],
	div[class*=" sect-head"] {
		padding: 12px;
		text-transform: uppercase;
		font-weight: bold;
		color: var(--white);
	}

	.sect-head-features {
		background-color: dodgerblue;
	}
	.sect-head-improvements {
		background-color: seagreen;
	}
	.sect-head-bugs {
		background-color: brown;
	}
	.sect-head-upcoming {
		background-color: mediumpurple;
	}

	.sect-body {
		padding: 15px 25px;

		li {
			list-style-type: disc;
		}
	}
}
</style>
