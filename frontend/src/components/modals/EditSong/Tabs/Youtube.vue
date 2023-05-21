<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useConfigStore } from "@/stores/config";
import { useEditSongStore } from "@/stores/editSong";

import { useSearchYoutube } from "@/composables/useSearchYoutube";
import { useYoutubeDirect } from "@/composables/useYoutubeDirect";

import SearchQueryItem from "../../../SearchQueryItem.vue";

const props = defineProps({
	modalUuid: { type: String, required: true },
	modalModulePath: { type: String, default: "modals/editSong/MODAL_UUID" }
});

const configStore = useConfigStore();
const { experimental } = storeToRefs(configStore);
const editSongStore = useEditSongStore({ modalUuid: props.modalUuid });

const { form, newSong } = storeToRefs(editSongStore);

const { updateYoutubeId } = editSongStore;

const { youtubeSearch, searchForSongs, loadMoreSongs } = useSearchYoutube();
const { youtubeDirect, getYoutubeVideoId } = useYoutubeDirect();

const selectSong = (youtubeId, result = null) => {
	updateYoutubeId(youtubeId);

	if (newSong && result)
		form.value.setValue({
			title: result.title,
			thumbnail: result.thumbnail
		});
};
</script>

<template>
	<div class="youtube-tab">
		<label class="label"> Add a YouTube song from a URL </label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter your YouTube song URL here..."
					v-model="youtubeDirect"
					@keyup.enter="selectSong(getYoutubeVideoId())"
				/>
			</p>
			<p class="control">
				<a
					class="button is-info"
					@click="selectSong(getYoutubeVideoId())"
					><i class="material-icons icon-with-button">add</i>Add</a
				>
			</p>
		</div>

		<div v-if="!experimental.disable_youtube_search">
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
						<i class="material-icons icon-with-button">search</i
						>Search
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
							v-if="
								form.inputs.mediaSource.value.startsWith(
									'youtube:'
								) &&
								result.id ===
									form.inputs.mediaSource.value.split(':')[1]
							"
							key="selected"
							>radio_button_checked
						</i>
						<i
							class="material-icons icon-not-selected"
							v-else
							@click.prevent="selectSong(result.id, result)"
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
