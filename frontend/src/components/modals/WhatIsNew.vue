<script setup lang="ts">
import { useStore } from "vuex";
import { onMounted, onBeforeUnmount } from "vue";

import { formatDistance } from "date-fns";
import { marked } from "marked";
import dompurify from "dompurify";

import { useModalState } from "@/vuex_helpers";

const store = useStore();

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const { news } = useModalState("modals/whatIsNew/MODAL_UUID", {
	modalUuid: props.modalUuid
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

onBeforeUnmount(() => {
	// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
	store.unregisterModule(["modals", "whatIsNew", props.modalUuid]);
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
			>&nbsp;<span :title="new Date(news.createdAt)">
				{{
					formatDistance(news.createdAt, new Date(), {
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
