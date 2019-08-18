<template>
	<modal title="Edit News">
		<div slot="body">
			<label class="label">Title</label>
			<p class="control">
				<input
					v-model="$parent.editing.title"
					class="input"
					type="text"
					placeholder="News Title"
					autofocus
				/>
			</p>
			<label class="label">Description</label>
			<p class="control">
				<input
					v-model="$parent.editing.description"
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
							@keyup.enter="addChange('bugs')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="addChange('bugs')"
							>Add</a
						>
					</p>
					<span
						v-for="(bug, index) in $parent.editing.bugs"
						class="tag is-info"
						:key="index"
					>
						{{ bug }}
						<button
							class="delete is-info"
							@click="removeChange('bugs', index)"
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
							@keyup.enter="addChange('features')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="addChange('features')"
							>Add</a
						>
					</p>
					<span
						v-for="(feature, index) in $parent.editing.features"
						class="tag is-info"
						:key="index"
					>
						{{ feature }}
						<button
							class="delete is-info"
							@click="removeChange('features', index)"
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
							@keyup.enter="addChange('improvements')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="addChange('improvements')"
							>Add</a
						>
					</p>
					<span
						v-for="(improvement, index) in $parent.editing
							.improvements"
						class="tag is-info"
						:key="index"
					>
						{{ improvement }}
						<button
							class="delete is-info"
							@click="removeChange('improvements', index)"
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
							@keyup.enter="addChange('upcoming')"
						/>
						<a
							class="button is-info"
							href="#"
							@click="addChange('upcoming')"
							>Add</a
						>
					</p>
					<span
						v-for="(upcoming, index) in $parent.editing.upcoming"
						class="tag is-info"
						:key="index"
					>
						{{ upcoming }}
						<button
							class="delete is-info"
							@click="removeChange('upcoming', index)"
						/>
					</span>
				</div>
			</div>
		</div>
		<div slot="footer">
			<button
				class="button is-success"
				@click="$parent.updateNews(false)"
			>
				<i class="material-icons save-changes">done</i>
				<span>&nbsp;Save</span>
			</button>
			<button class="button is-success" @click="$parent.updateNews(true)">
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
import { mapActions } from "vuex";

import { Toast } from "vue-roaster";

import Modal from "./Modal.vue";

export default {
	components: { Modal },
	methods: {
		addChange(type) {
			const change = document.getElementById(`edit-${type}`).value.trim();

			if (this.$parent.editing[type].indexOf(change) !== -1)
				return Toast.methods.addToast(`Tag already exists`, 3000);

			if (change) this.$parent.editing[type].push(change);
			else Toast.methods.addToast(`${type} cannot be empty`, 3000);

			document.getElementById(`edit-${type}`).value = "";
			return true;
		},
		removeChange(type, index) {
			this.$parent.editing[type].splice(index, 1);
		},
		...mapActions("modals", ["closeModal"])
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
