<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Toast from "toasters";
import { formatDistance } from "date-fns";
import { useWebsocketStore } from "@/stores/websocket";
import { useModalsStore } from "@/stores/modals";
import { useForm } from "@/composables/useForm";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const SaveButton = defineAsyncComponent(
	() => import("@/components/SaveButton.vue")
);
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	createNews: { type: Boolean, default: false },
	newsId: { type: String, default: null },
	sector: { type: String, default: "admin" }
});

const { onReady, runJob } = useWebsocketStore();

const { closeCurrentModal } = useModalsStore();

const createdBy = ref();
const createdAt = ref(0);

const getTitle = () => {
	let title = "";
	const preview = document.getElementById("preview");

	// validate existence of h1 for the page title

	if (!preview || preview.childNodes.length === 0) return "";

	if (preview.childNodes[0].nodeName !== "H1") {
		for (let node = 0; node < preview.childNodes.length; node += 1) {
			if (preview.childNodes[node].nodeName) {
				if (preview.childNodes[node].nodeName === "H1")
					title = preview.childNodes[node].textContent || "";

				break;
			}
		}
	} else title = preview.childNodes[0].textContent || "";

	return title;
};

const { inputs, save, setOriginalValue } = useForm(
	{
		markdown: {
			value: "# Header\n## Sub-Header\n- **So**\n- _Many_\n- ~Points~\n\nOther things you want to say and [link](https://example.com).\n\n### Sub-Sub-Header\n> Oh look, a quote!\n\n`lil code`\n\n```\nbig code\n```\n",
			validate: (value: string) => {
				if (value === "") return "News item cannot be empty.";
				if (!getTitle())
					return "Please provide a title (heading level 1) at the top of the document.";
				return true;
			}
		},
		status: "published",
		showToNewUsers: false
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success") {
			const query = {
				title: getTitle(),
				markdown: values.markdown,
				status: values.status,
				showToNewUsers: values.showToNewUsers
			};

			runJob(`data.news.${props.createNews ? "create" : "updateById"}`, {
				_id: props.createNews ? null : props.newsId,
				query
			})
				.then(resolve)
				.catch(reject);
		} else {
			if (status === "unchanged") new Toast(messages.unchanged);
			else if (status === "error")
				Object.values(messages).forEach(message => {
					new Toast({ content: message, timeout: 8000 });
				});
			resolve();
		}
	},
	{
		modalUuid: props.modalUuid
	}
);

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
		if (props.newsId && !props.createNews) {
			const data = await runJob(`data.news.findById`, {
				_id: props.newsId
			}).catch(() => {
				new Toast("News with that ID not found.");
				closeCurrentModal();
			});

			setOriginalValue({
				markdown: data.markdown,
				status: data.status,
				showToNewUsers: data.showToNewUsers
			});

			createdBy.value = data.createdBy;
			createdAt.value = data.createdAt;
		}
	});
});
</script>

<template>
	<modal
		class="edit-news-modal"
		:title="createNews ? 'Create News' : 'Edit News'"
		:size="'wide'"
		:split="true"
	>
		<template #body>
			<div class="left-section">
				<p><strong>Markdown</strong></p>
				<textarea v-model="inputs['markdown'].value"></textarea>
			</div>
			<div class="right-section">
				<p><strong>Preview</strong></p>
				<div
					class="news-item"
					id="preview"
					v-html="
						DOMPurify.sanitize(marked(inputs['markdown'].value))
					"
				></div>
			</div>
		</template>
		<template #footer>
			<div>
				<p class="control select">
					<select v-model="inputs['status'].value">
						<option value="draft">Draft</option>
						<option value="published" selected>Publish</option>
					</select>
				</p>

				<p class="is-expanded checkbox-control">
					<label class="switch">
						<input
							type="checkbox"
							id="show-to-new-users"
							v-model="inputs['showToNewUsers'].value"
						/>
						<span class="slider round"></span>
					</label>

					<label for="show-to-new-users">
						<p>Show to new users</p>
					</label>
				</p>

				<save-button
					ref="saveButton"
					v-if="createNews"
					@clicked="save()"
				/>

				<save-button
					ref="saveAndCloseButton"
					default-message="Save and close"
					@clicked="save(closeCurrentModal)"
				/>
				<div class="right" v-if="createdAt > 0">
					<span>
						By
						<user-link
							:user-id="createdBy"
							:alt="createdBy"
						/> </span
					>&nbsp;<span :title="new Date(createdAt).toString()">
						{{
							formatDistance(createdAt, new Date(), {
								addSuffix: true
							})
						}}
					</span>
				</div>
			</div>
		</template>
	</modal>
</template>

<style lang="less">
.edit-news-modal .modal-card .modal-card-foot .right {
	column-gap: 5px;
}
</style>

<style lang="less" scoped>
.night-mode {
	.edit-news-modal .modal-card .modal-card-body textarea,
	.edit-news-modal .modal-card .modal-card-body #preview {
		border-color: var(--grey-3);
	}

	.edit-news-modal .modal-card .modal-card-body textarea {
		background-color: var(--dark-grey);
		color: var(--white);
	}
}
.edit-news-modal .modal-card .modal-card-body {
	.left-section,
	.right-section {
		padding: 10px;
	}

	textarea {
		border: 0;
		outline: none;
		resize: none;
		font-size: 16px;
	}

	#preview {
		word-break: break-all;
		overflow: auto;
		box-shadow: 0;
	}

	textarea,
	#preview {
		padding: 5px;
		border: 1px solid var(--light-grey-3) !important;
		border-radius: @border-radius;
		height: calc(100vh - 280px);
		width: 100%;
	}
}

.edit-news-modal .modal-card .modal-card-foot {
	.control {
		margin-bottom: 0 !important;
	}

	.right {
		line-height: 36px;
		column-gap: 0;
	}
}
</style>
