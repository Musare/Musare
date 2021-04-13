<template>
	<modal title="Edit News">
		<div slot="body" v-if="news && news._id">
			<label class="label">Title</label>
			<p class="control">
				<input
					v-model="news.title"
					class="input"
					type="text"
					placeholder="News Title"
					autofocus
				/>
			</p>
			<label class="label">Description</label>
			<p class="control">
				<input
					v-model="news.description"
					class="input"
					type="text"
					placeholder="News Description"
				/>
			</p>
			<div class="columns">
				<div class="column">
					<label class="label">Bugs</label>
					<p class="control has-addons">
						<input
							ref="edit-bugs"
							class="input"
							type="text"
							placeholder="Bug"
							@keyup.enter="add('bugs')"
						/>
						<a class="button is-info" href="#" @click="add('bugs')"
							>Add</a
						>
					</p>
					<span
						v-for="(bug, index) in news.bugs"
						class="tag is-info"
						:key="index"
					>
						{{ bug }}
						<button
							class="delete is-info"
							@click="remove('bugs', index)"
						/>
					</span>
				</div>
				<div class="column">
					<label class="label">Features</label>
					<p class="control has-addons">
						<input
							ref="edit-features"
							class="input"
							type="text"
							placeholder="Feature"
							@keyup.enter="add('features')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="add('features')"
							>Add</a
						>
					</p>
					<span
						v-for="(feature, index) in news.features"
						class="tag is-info"
						:key="index"
					>
						{{ feature }}
						<button
							class="delete is-info"
							@click="remove('features', index)"
						/>
					</span>
				</div>
			</div>

			<div class="columns">
				<div class="column">
					<label class="label">Improvements</label>
					<p class="control has-addons">
						<input
							ref="edit-improvements"
							class="input"
							type="text"
							placeholder="Improvement"
							@keyup.enter="add('improvements')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="add('improvements')"
							>Add</a
						>
					</p>
					<span
						v-for="(improvement, index) in news.improvements"
						class="tag is-info"
						:key="index"
					>
						{{ improvement }}
						<button
							class="delete is-info"
							@click="remove('improvements', index)"
						/>
					</span>
				</div>
				<div class="column">
					<label class="label">Upcoming</label>
					<p class="control has-addons">
						<input
							ref="edit-upcoming"
							class="input"
							type="text"
							placeholder="Upcoming"
							@keyup.enter="add('upcoming')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="add('upcoming')"
							>Add</a
						>
					</p>
					<span
						v-for="(upcoming, index) in news.upcoming"
						class="tag is-info"
						:key="index"
					>
						{{ upcoming }}
						<button
							class="delete is-info"
							@click="remove('upcoming', index)"
						/>
					</span>
				</div>
			</div>
		</div>
		<div slot="footer">
			<button class="button is-success" @click="updateNews(false)">
				<i class="material-icons save-changes">done</i>
				<span>&nbsp;Save</span>
			</button>
			<button class="button is-success" @click="updateNews(true)">
				<i class="material-icons save-changes">done</i>
				<span>&nbsp;Save and close</span>
			</button>
		</div>
	</modal>
</template>

<script>
import { mapActions, mapGetters, mapState } from "vuex";

import Toast from "toasters";

import Modal from "../Modal.vue";

export default {
	components: { Modal },
	props: {
		newsId: { type: String, default: "" },
		sector: { type: String, default: "admin" }
	},
	computed: {
		...mapState("modals/editNews", {
			news: state => state.news
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch(`news.getNewsFromId`, this.newsId, res => {
			if (res.status === "success") {
				const { news } = res.data;
				this.editNews(news);
			} else {
				new Toast("News with that ID not found");
				this.closeModal({
					sector: this.sector,
					modal: "editNews"
				});
			}
		});
	},
	methods: {
		add(type) {
			const change = this.$refs[`edit-${type}`].value.trim();

			if (this.news[type].indexOf(change) !== -1)
				return new Toast(`Tag already exists`);

			if (change) this.addChange({ type, change });
			else new Toast(`${type} cannot be empty`);

			this.$refs[`edit-${type}`].value = "";
			return true;
		},
		remove(type, index) {
			this.removeChange({ type, index });
		},
		updateNews(close) {
			this.socket.dispatch(
				"news.update",
				this.news._id,
				this.news,
				res => {
					new Toast(res.message);
					if (res.status === "success") {
						if (close)
							this.closeModal({
								sector: this.sector,
								modal: "editNews"
							});
					}
				}
			);
		},
		...mapActions("modalVisibility", ["closeModal"]),
		...mapActions("modals/editNews", [
			"editNews",
			"addChange",
			"removeChange"
		])
	}
};
</script>

<style lang="scss" scoped>
input[type="range"] {
	-webkit-appearance: none;
	width: 100%;
	margin: 7.3px 0;
}

input[type="range"]:focus {
	outline: none;
}

input[type="range"]::-webkit-slider-runnable-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: var(--light-grey-3);
	border-radius: 0;
	border: 0;
}

input[type="range"]::-webkit-slider-thumb {
	box-shadow: 0;
	border: 0;
	height: 19px;
	width: 19px;
	border-radius: 15px;
	background: var(--primary-color);
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -6.5px;
}

input[type="range"]::-moz-range-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: var(--light-grey-3);
	border-radius: 0;
	border: 0;
}

input[type="range"]::-moz-range-thumb {
	box-shadow: 0;
	border: 0;
	height: 19px;
	width: 19px;
	border-radius: 15px;
	background: var(--primary-color);
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -6.5px;
}

input[type="range"]::-ms-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: var(--light-grey-3);
	border-radius: 1.3px;
}

input[type="range"]::-ms-fill-lower {
	background: var(--light-grey-3);
	border: 0;
	border-radius: 0;
	box-shadow: 0;
}

input[type="range"]::-ms-fill-upper {
	background: var(--light-grey-3);
	border: 0;
	border-radius: 0;
	box-shadow: 0;
}

input[type="range"]::-ms-thumb {
	box-shadow: 0;
	border: 0;
	height: 15px;
	width: 15px;
	border-radius: 15px;
	background: var(--primary-color);
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: 1.5px;
}

.controls {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.artist-genres {
	display: flex;
	justify-content: space-between;
}

#volumeSlider {
	margin-bottom: 15px;
}

.has-text-centered {
	padding: 10px;
}

.thumbnail-preview {
	display: flex;
	margin: 0 auto 25px auto;
	max-width: 200px;
	width: 100%;
}

.modal-card-body,
.modal-card-foot {
	border-top: 0;
}

.label,
.checkbox,
h5 {
	font-weight: normal;
}

.video-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 10px;

	iframe {
		pointer-events: none;
	}
}

.save-changes {
	color: var(--white);
}

.tag:not(:last-child) {
	margin-right: 5px;
}
</style>
