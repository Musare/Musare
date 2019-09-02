<template>
	<modal title="Edit News">
		<div slot="body">
			<label class="label">Title</label>
			<p class="control">
				<input
					v-model="editing.title"
					class="input"
					type="text"
					placeholder="News Title"
					autofocus
				/>
			</p>
			<label class="label">Description</label>
			<p class="control">
				<input
					v-model="editing.description"
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
							id="edit-bugs"
							class="input"
							type="text"
							placeholder="Bug"
							@keyup.enter="addChangeClick('bugs')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="addChangeClick('bugs')"
							>Add</a
						>
					</p>
					<span
						v-for="(bug, index) in editing.bugs"
						class="tag is-info"
						:key="index"
					>
						{{ bug }}
						<button
							class="delete is-info"
							@click="removeChangeClick('bugs', index)"
						/>
					</span>
				</div>
				<div class="column">
					<label class="label">Features</label>
					<p class="control has-addons">
						<input
							id="edit-features"
							class="input"
							type="text"
							placeholder="Feature"
							@keyup.enter="addChangeClick('features')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="addChangeClick('features')"
							>Add</a
						>
					</p>
					<span
						v-for="(feature, index) in editing.features"
						class="tag is-info"
						:key="index"
					>
						{{ feature }}
						<button
							class="delete is-info"
							@click="removeChangeClick('features', index)"
						/>
					</span>
				</div>
			</div>

			<div class="columns">
				<div class="column">
					<label class="label">Improvements</label>
					<p class="control has-addons">
						<input
							id="edit-improvements"
							class="input"
							type="text"
							placeholder="Improvement"
							@keyup.enter="addChangeClick('improvements')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="addChangeClick('improvements')"
							>Add</a
						>
					</p>
					<span
						v-for="(improvement, index) in editing.improvements"
						class="tag is-info"
						:key="index"
					>
						{{ improvement }}
						<button
							class="delete is-info"
							@click="removeChangeClick('improvements', index)"
						/>
					</span>
				</div>
				<div class="column">
					<label class="label">Upcoming</label>
					<p class="control has-addons">
						<input
							id="edit-upcoming"
							class="input"
							type="text"
							placeholder="Upcoming"
							@keyup.enter="addChangeClick('upcoming')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="addChangeClick('upcoming')"
							>Add</a
						>
					</p>
					<span
						v-for="(upcoming, index) in editing.upcoming"
						class="tag is-info"
						:key="index"
					>
						{{ upcoming }}
						<button
							class="delete is-info"
							@click="removeChangeClick('upcoming', index)"
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
			<button
				class="button is-danger"
				@click="
					closeModal({
						sector: 'admin',
						modal: 'editNews'
					})
				"
			>
				<span>&nbsp;Close</span>
			</button>
		</div>
	</modal>
</template>

<script>
import { mapActions, mapState } from "vuex";

import { Toast } from "vue-roaster";
import io from "../../io";

import Modal from "./Modal.vue";

export default {
	components: { Modal },
	computed: {
		...mapState("admin/news", {
			editing: state => state.editing
		})
	},
	methods: {
		addChange(type) {
			const change = document.getElementById(`edit-${type}`).value.trim();

			if (this.editing[type].indexOf(change) !== -1)
				return Toast.methods.addToast(`Tag already exists`, 3000);

			if (change) this.addChange({ type, change });
			else Toast.methods.addToast(`${type} cannot be empty`, 3000);

			document.getElementById(`edit-${type}`).value = "";
			return true;
		},
		removeChange(type, index) {
			this.removeChange({ type, index });
		},
		updateNews(close) {
			this.socket.emit(
				"news.update",
				this.editing._id,
				this.editing,
				res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === "success") {
						if (close)
							this.closeModal({
								sector: "admin",
								modal: "editNews"
							});
					}
				}
			);
		},
		...mapActions("modals", ["closeModal"]),
		...mapActions("admin/news", ["addChange", "removeChange"])
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
		});
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

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
	background: $light-grey-2;
	border-radius: 0;
	border: 0;
}

input[type="range"]::-webkit-slider-thumb {
	box-shadow: 0;
	border: 0;
	height: 19px;
	width: 19px;
	border-radius: 15px;
	background: $primary-color;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -6.5px;
}

input[type="range"]::-moz-range-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: $light-grey-2;
	border-radius: 0;
	border: 0;
}

input[type="range"]::-moz-range-thumb {
	box-shadow: 0;
	border: 0;
	height: 19px;
	width: 19px;
	border-radius: 15px;
	background: $primary-color;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -6.5px;
}

input[type="range"]::-ms-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: $light-grey-2;
	border-radius: 1.3px;
}

input[type="range"]::-ms-fill-lower {
	background: $light-grey-2;
	border: 0;
	border-radius: 0;
	box-shadow: 0;
}

input[type="range"]::-ms-fill-upper {
	background: $light-grey-2;
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
	background: $primary-color;
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
	color: $white;
}

.tag:not(:last-child) {
	margin-right: 5px;
}
</style>
