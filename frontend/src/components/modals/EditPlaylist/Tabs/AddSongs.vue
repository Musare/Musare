<template>
	<div class="youtube-tab section">
		<div>
			<label class="label"> Search for a song on Musare </label>
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
					<a
						class="button is-info"
						@click.prevent="searchForSongs()"
						href="#"
						><i class="material-icons icon-with-button">search</i
						>Search</a
					>
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
									addYouTubeSongToPlaylist(result.id, index)
								"
								>playlist_add</i
							>
						</transition>
					</template>
				</search-query-item>

				<a
					class="button is-primary load-more-button"
					@click.prevent="loadMoreSongs()"
					href="#"
				>
					Load more...
				</a>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters } from "vuex";

import SearchYoutube from "@/mixins/SearchYoutube.vue";
import SearchMusare from "@/mixins/SearchMusare.vue";

import SongItem from "@/components/SongItem.vue";
import SearchQueryItem from "@/components/SearchQueryItem.vue";

export default {
	components: { SearchQueryItem, SongItem },
	mixins: [SearchYoutube, SearchMusare],
	computed: {
		...mapState("modals/editPlaylist", {
			playlist: state => state.playlist
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		"youtubeSearch.songs.results": function checkIfSongInPlaylist(songs) {
			songs.forEach((searchItem, index) =>
				this.playlist.songs.find(song => {
					if (song.youtubeId === searchItem.id)
						this.youtubeSearch.songs.results[
							index
						].isAddedToQueue = true;

					return song.youtubeId === searchItem.id;
				})
			);
		},
		"musareSearch.results": function checkIfSongInPlaylist(songs) {
			songs.forEach((searchItem, index) =>
				this.playlist.songs.find(song => {
					if (song._id === searchItem._id)
						this.musareSearch.results[index].isAddedToQueue = true;

					return song._id === searchItem._id;
				})
			);
		},
		"playlist.songs": function checkIfSongInPlaylist() {
			this.youtubeSearch.songs.results.forEach((searchItem, index) =>
				this.playlist.songs.find(song => {
					this.youtubeSearch.songs.results[
						index
					].isAddedToQueue = false;
					if (song.youtubeId === searchItem.id)
						this.youtubeSearch.songs.results[
							index
						].isAddedToQueue = true;

					return song.youtubeId === searchItem.id;
				})
			);
			console.log(222);
			this.musareSearch.results.forEach((searchItem, index) =>
				this.playlist.songs.find(song => {
					this.musareSearch.results[index].isAddedToQueue = false;
					if (song.youtubeId === searchItem.youtubeId)
						this.musareSearch.results[index].isAddedToQueue = true;

					return song.youtubeId === searchItem.youtubeId;
				})
			);
		}
	}
};
</script>

<style lang="scss" scoped>
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
