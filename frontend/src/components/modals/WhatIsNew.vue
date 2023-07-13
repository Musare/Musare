<script setup lang="ts">
import { defineAsyncComponent, onMounted } from "vue";
import { formatDistance } from "date-fns";
import { marked } from "marked";
import dompurify from "dompurify";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

defineProps({
	modalUuid: { type: String, required: true },
	news: { type: Object, required: true }
});

onMounted(() => {
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
	<modal title="News" class="what-is-news-modal">
		<template #body>
			<div
				class="section news-item"
				v-html="sanitize(marked(news.markdown))"
			></div>
		</template>
		<template #footer>
			<span v-if="news.createdBy">
				By
				<user-link
					:user-id="news.createdBy"
					:alt="news.createdBy" /></span
			>&nbsp;<span :title="new Date(news.createdAt).toString()">
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
