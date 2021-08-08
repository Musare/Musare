<template>
	<modal
		class="edit-news-modal"
		:title="newsId ? 'Edit News' : 'Create News'"
	>
		<template #body>
			<div id="markdown-editor-and-preview">
				<div class="column">
					<p><strong>Markdown</strong></p>
					<textarea v-model="markdown"></textarea>
				</div>
				<div class="column">
					<p><strong>Preview</strong></p>
					<div
						class="news-item"
						id="preview"
						v-html="sanitize(marked(markdown))"
					></div>
				</div>
			</div>
		</template>
		<template #footer>
			<div>
				<p class="control select">
					<select v-model="status">
						<option value="draft">Draft</option>
						<option value="published" selected>Publish</option>
					</select>
				</p>

				<save-button
					ref="saveButton"
					v-if="newsId"
					@clicked="newsId ? update(false) : create(false)"
				/>

				<save-button
					ref="saveAndCloseButton"
					default-message="Save and close"
					@clicked="newsId ? update(true) : create(true)"
				/>
				<div class="right" v-if="createdAt > 0">
					<span>
						By
						<user-id-to-username
							:user-id="createdBy"
							:alt="createdBy"
							:link="true" /></span
					><span :title="new Date(createdAt)">
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

<script>
import { mapActions, mapGetters, mapState } from "vuex";
import marked from "marked";
import { sanitize } from "dompurify";
import Toast from "toasters";
import { formatDistance } from "date-fns";

import UserIdToUsername from "@/components/UserIdToUsername.vue";
import SaveButton from "../SaveButton.vue";
import Modal from "../Modal.vue";

export default {
	components: { Modal, SaveButton, UserIdToUsername },
	props: {
		newsId: { type: String, default: "" },
		sector: { type: String, default: "admin" }
	},
	data() {
		return {
			markdown:
				"# Header\n ## Sub-Header\n- **So**\n- _Many_\n- ~Points~\n\nOther things you want to say and [link](https://example.com).\n\n### Sub-Sub-Header\n> Oh look, a quote!\n\n`lil code`\n\n```\nbig code\n```\n",
			status: "published",
			createdBy: null,
			createdAt: 0
		};
	},
	computed: {
		...mapState("modals/editNews", { news: state => state.news }),
		...mapGetters({ socket: "websockets/getSocket" })
	},
	mounted() {
		marked.use({
			renderer: {
				table(header, body) {
					return `<table class="table is-striped">
					<thead>${header}</thead>
					<tbody>${body}</tbody>
					</table>`;
				}
			}
		});

		if (this.newsId) {
			this.socket.dispatch(`news.getNewsFromId`, this.newsId, res => {
				if (res.status === "success") {
					const { markdown, status, createdBy, createdAt } =
						res.data.news;
					this.markdown = markdown;
					this.status = status;
					this.createdBy = createdBy;
					this.createdAt = createdAt;
				} else {
					new Toast("News with that ID not found.");
					this.closeModal("editNews");
				}
			});
		}
	},
	methods: {
		marked,
		sanitize,
		getTitle() {
			let title = "";
			const preview = document.getElementById("preview");

			// validate existence of h1 for the page title

			if (preview.childNodes.length === 0) return "";

			if (preview.childNodes[0].tagName !== "H1") {
				for (
					let node = 0;
					node < preview.childNodes.length;
					node += 1
				) {
					if (preview.childNodes[node].tagName) {
						if (preview.childNodes[node].tagName === "H1")
							title = preview.childNodes[node].innerText;

						break;
					}
				}
			} else title = preview.childNodes[0].innerText;

			return title;
		},
		create(close) {
			if (this.markdown === "")
				return new Toast("News item cannot be empty.");

			const title = this.getTitle();
			if (!title)
				return new Toast(
					"Please provide a title (heading level 1) at the top of the document."
				);

			return this.socket.dispatch(
				"news.create",
				{
					title,
					markdown: this.markdown,
					status: this.status
				},
				res => {
					new Toast(res.message);
					if (res.status === "success" && close)
						this.closeModal("editNews");
				}
			);
		},
		update(close) {
			if (this.markdown === "")
				return new Toast("News item cannot be empty.");

			const title = this.getTitle();
			if (!title)
				return new Toast(
					"Please provide a title (heading level 1) at the top of the document."
				);

			return this.socket.dispatch(
				"news.update",
				this.newsId,
				{
					title,
					markdown: this.markdown,
					status: this.status
				},
				res => {
					new Toast(res.message);
					if (res.status === "success" && close)
						this.closeModal("editNews");
				}
			);
		},
		formatDistance,
		...mapActions("modalVisibility", ["closeModal"]),
		...mapActions("modals/editNews", [
			"editNews",
			"addChange",
			"removeChange"
		])
	}
};
</script>

<style lang="scss">
.edit-news-modal {
	.modal-card {
		width: 1300px;
		.modal-card-foot .right {
			margin: auto 0 auto auto !important;

			span:not(:last-child) {
				margin-right: 0 !important;
			}
		}
	}
}
</style>

<style lang="scss" scoped>
.night-mode {
	#markdown-editor-and-preview textarea,
	#markdown-editor-and-preview #preview {
		border-color: #fff;
	}
}

#markdown-editor-and-preview {
	display: flex;
	flex-wrap: wrap;

	.column {
		display: flex;
		flex-direction: column;
		width: 350px;
		flex-grow: 1;
		flex-basis: initial;
	}

	textarea {
		border: 0;
		outline: none;
		resize: none;
		margin-right: 5px;
		font-size: 16px;
	}

	#preview {
		word-break: break-all;
		overflow: auto;
		box-shadow: none;
	}

	textarea,
	#preview {
		padding: 5px;
		border: 1px solid var(--light-grey-3) !important;
		border-radius: 3px;
		height: 700px;
	}
}
</style>
