<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useEditSongStore } from "@/stores/editSong";

import { useSearchYoutube } from "@/composables/useSearchYoutube";

import SearchQueryItem from "../../../SearchQueryItem.vue";

const props = defineProps({
	modalUuid: { type: String, required: true },
	modalModulePath: { type: String, default: "modals/editSong/MODAL_UUID" }
});

const editSongStore = useEditSongStore(props);

const { form, newSong } = storeToRefs(editSongStore);

const { updateYoutubeId } = editSongStore;

const { youtubeSearch, searchForSongs, loadMoreSongs } = useSearchYoutube();

const selectSong = result => {
	updateYoutubeId(result.id);

	if (newSong)
		form.value.setValue({
			title: result.title,
			thumbnail: result.thumbnail
		});
};
</script>

<template>
	<div class="youtube-tab">
		<label class="label"> Search for a song from YouTube </label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter your YouTube query here..."
					v-model="youtubeSearch.songs.query"
					autofocus
					@keyup.enter="searchForSongs()"
				/>
			</p>
			<p class="control">
				<button
					class="button is-info"
					@click.prevent="searchForSongs()"
				>
					<i class="material-icons icon-with-button">search</i>Search
				</button>
			</p>
		</div>

		<div
			v-if="youtubeSearch.songs.results.length > 0"
			id="song-query-results"
		>
			<search-query-item
				v-for="result in youtubeSearch.songs.results"
				:key="result.id"
				:result="result"
			>
				<template #actions>
					<i
						class="material-icons icon-selected"
						v-if="result.id === form.inputs.youtubeId.value"
						key="selected"
						>radio_button_checked
					</i>
					<i
						class="material-icons icon-not-selected"
						v-else
						@click.prevent="selectSong(result)"
						key="not-selected"
						>radio_button_unchecked
					</i>
				</template>
			</search-query-item>

			<button
				class="button is-primary load-more-button"
				@click.prevent="loadMoreSongs()"
			>
				Load more...
			</button>
		</div>
	</div>
</template>

<style lang="less" scoped>
.youtube-tab #song-query-results {
	height: calc(100% - 74px);
	overflow: auto;

	.search-query-item {
		.icon-selected {
			color: var(--green) !important;
		}

		.icon-not-selected {
			color: var(--grey) !important;
		}
	}

	.search-query-item:not(:last-of-type) {
		margin-bottom: 10px;
	}

	.load-more-button {
		width: 100%;
		margin-top: 10px;
	}
}
</style>
