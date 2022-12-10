<script setup lang="ts">
import { defineAsyncComponent, ref, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useSearchYoutube } from "@/composables/useSearchYoutube";
import { useSearchMusare } from "@/composables/useSearchMusare";
import { useYoutubeDirect } from "@/composables/useYoutubeDirect";
import { useEditPlaylistStore } from "@/stores/editPlaylist";

const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);
const SearchQueryItem = defineAsyncComponent(
	() => import("@/components/SearchQueryItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true }
});

const editPlaylistStore = useEditPlaylistStore({ modalUuid: props.modalUuid });
const { playlist } = storeToRefs(editPlaylistStore);

const sitename = ref("Musare");

const {
	youtubeSearch,
	searchForSongs,
	loadMoreSongs,
	addYouTubeSongToPlaylist
} = useSearchYoutube();

const {
	musareSearch,
	resultsLeftCount,
	nextPageResultsCount,
	searchForMusareSongs,
	addMusareSongToPlaylist
} = useSearchMusare();

const { youtubeDirect, addToPlaylist } = useYoutubeDirect();

watch(
	() => youtubeSearch.value.songs.results,
	songs => {
		songs.forEach((searchItem, index) =>
			playlist.value.songs.find(song => {
				if (song.youtubeId === searchItem.id)
					youtubeSearch.value.songs.results[index].isAddedToQueue =
						true;
				return song.youtubeId === searchItem.id;
			})
		);
	}
);
watch(
	() => musareSearch.value.results,
	songs => {
		songs.forEach((searchItem, index) =>
			playlist.value.songs.find(song => {
				if (song._id === searchItem._id)
					musareSearch.value.results[index].isAddedToQueue = true;

				return song._id === searchItem._id;
			})
		);
	}
);
watch(
	() => playlist.value.songs,
	() => {
		youtubeSearch.value.songs.results.forEach((searchItem, index) =>
			playlist.value.songs.find(song => {
				youtubeSearch.value.songs.results[index].isAddedToQueue = false;
				if (song.youtubeId === searchItem.id)
					youtubeSearch.value.songs.results[index].isAddedToQueue =
						true;

				return song.youtubeId === searchItem.id;
			})
		);
		musareSearch.value.results.forEach((searchItem, index) =>
			playlist.value.songs.find(song => {
				musareSearch.value.results[index].isAddedToQueue = false;
				if (song.youtubeId === searchItem.youtubeId)
					musareSearch.value.results[index].isAddedToQueue = true;

				return song.youtubeId === searchItem.youtubeId;
			})
		);
	}
);

onMounted(async () => {
	sitename.value = await lofig.get("siteSettings.sitename");
});
</script>

<template>
	<div class="youtube-tab section">
		<div>
			<label class="label"> Search for a song on {{ sitename }}</label>
			<div class="control is-grouped input-with-button">
				<p class="control is-expanded">
					<input
						class="input"
						type="text"
						placeholder="Enter your song query here..."
						v-model="musareSearch.query"
						@keyup.enter="searchForMusareSongs(1)"
					/>
				</p>
				<p class="control">
					<a class="button is-info" @click="searchForMusareSongs(1)"
						><i class="material-icons icon-with-button">search</i
						>Search</a
					>
				</p>
			</div>
			<div
				v-if="musareSearch.results.length > 0"
				class="song-query-results"
			>
				<song-item
					v-for="(song, index) in musareSearch.results"
					:key="song._id"
					:song="song"
				>
					<template #actions>
						<transition
							name="musare-search-query-actions"
							mode="out-in"
						>
							<i
								v-if="song.isAddedToQueue"
								class="material-icons added-to-playlist-icon"
								content="Song is already in playlist"
								v-tippy
								>done</i
							>
							<i
								v-else
								class="material-icons add-to-playlist-icon"
								content="Add Song to Playlist"
								v-tippy
								@click="
									addMusareSongToPlaylist(
										playlist._id,
										song.youtubeId,
										index
									)
								"
								>playlist_add</i
							>
						</transition>
					</template>
				</song-item>

				<button
					v-if="resultsLeftCount > 0"
					class="button is-primary load-more-button"
					@click="searchForMusareSongs(musareSearch.page + 1)"
				>
					Load {{ nextPageResultsCount }} more results
				</button>
			</div>
		</div>

		<br v-if="musareSearch.results.length > 0" />

		<label class="label"> Add a YouTube song from a URL </label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter your YouTube song URL here..."
					v-model="youtubeDirect"
					@keyup.enter="addToPlaylist(playlist._id)"
				/>
			</p>
			<p class="control">
				<a class="button is-info" @click="addToPlaylist(playlist._id)"
					><i class="material-icons icon-with-button">add</i>Add</a
				>
			</p>
		</div>

		<div>
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
				class="song-query-results"
			>
				<search-query-item
					v-for="(result, index) in youtubeSearch.songs.results"
					:key="result.id"
					:result="result"
				>
					<template #actions>
						<transition
							name="youtube-search-query-actions"
							mode="out-in"
						>
							<i
								v-if="result.isAddedToQueue"
								class="material-icons added-to-playlist-icon"
								content="Song is already in playlist"
								v-tippy
								>done</i
							>
							<i
								v-else
								class="material-icons add-to-playlist-icon"
								content="Add Song to Playlist"
								v-tippy
								@click="
									addYouTubeSongToPlaylist(
										playlist._id,
										result.id,
										index
									)
								"
								>playlist_add</i
							>
						</transition>
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
.youtube-tab {
	.song-query-results {
		margin-top: 10px;
		max-width: 565px;

		.search-query-item:not(:last-of-type) {
			margin-bottom: 10px;
		}
	}

	.load-more-button {
		width: 100%;
		margin-top: 10px;
	}
}

@media screen and (max-width: 1300px) {
	.youtube-tab .song-query-results,
	.section {
		max-width: 100% !important;
	}
}
</style>
