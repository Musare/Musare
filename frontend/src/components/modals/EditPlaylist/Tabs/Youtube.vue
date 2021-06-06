<template>
	<div class="youtube-tab section">
		<h4 class="section-title">Import from YouTube</h4>

		<p class="section-description">
			Import a playlist or song by searching or using a link from YouTube.
		</p>

		<hr class="section-horizontal-rule" />

		<label class="label">
			Search for a playlist from YouTube
		</label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter YouTube Playlist URL here..."
					v-model="search.playlist.query"
					@keyup.enter="importPlaylist()"
				/>
			</p>
			<p class="control has-addons">
				<span class="select" id="playlist-import-type">
					<select v-model="search.playlist.isImportingOnlyMusic">
						<option :value="false">Import all</option>
						<option :value="true">
							Import only music
						</option>
					</select>
				</span>
				<a
					class="button is-info"
					@click.prevent="importPlaylist()"
					href="#"
					><i class="material-icons icon-with-button">publish</i
					>Import</a
				>
			</p>
		</div>

		<label class="label">
			Search for a song from YouTube
		</label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter your YouTube query here..."
					v-model="search.songs.query"
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

		<div v-if="search.songs.results.length > 0" id="song-query-results">
			<search-query-item
				v-for="(result, index) in search.songs.results"
				:key="result.id"
				:result="result"
			>
				<template #actions>
					<transition name="search-query-actions" mode="out-in">
						<a
							class="button is-success"
							v-if="result.isAddedToQueue"
							href="#"
							key="added-to-playlist"
						>
							<i class="material-icons icon-with-button">done</i>
							Added to playlist
						</a>
						<a
							class="button is-dark"
							v-else
							@click.prevent="addSongToPlaylist(result.id, index)"
							href="#"
							key="add-to-playlist"
						>
							<i class="material-icons icon-with-button">add</i>
							Add to playlist
						</a>
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
</template>

<script>
import { mapState, mapGetters /* , mapActions */ } from "vuex";
import Toast from "toasters";

import SearchYoutube from "@/mixins/SearchYoutube.vue";

import SearchQueryItem from "../../../SearchQueryItem.vue";

export default {
	components: { SearchQueryItem },
	mixins: [SearchYoutube],
	data() {
		return {};
	},
	computed: {
		...mapState("modals/editPlaylist", {
			playlist: state => state.playlist
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		"search.songs.results": function checkIfSongInPlaylist(songs) {
			songs.forEach((searchItem, index) =>
				this.playlist.songs.find(song => {
					if (song.youtubeId === searchItem.id)
						this.search.songs.results[index].isAddedToQueue = true;

					return song.youtubeId === searchItem.id;
				})
			);
		},
		"playlist.songs": function checkIfSongInPlaylist() {
			this.search.songs.results.forEach((searchItem, index) =>
				this.playlist.songs.find(song => {
					this.search.songs.results[index].isAddedToQueue = false;
					if (song.youtubeId === searchItem.id)
						this.search.songs.results[index].isAddedToQueue = true;

					return song.youtubeId === searchItem.id;
				})
			);
		}
	},
	mounted() {},
	methods: {
		importPlaylist() {
			let isImportingPlaylist = true;

			// import query is blank
			if (!this.search.playlist.query)
				return new Toast("Please enter a YouTube playlist URL.");

			const regex = new RegExp(`[\\?&]list=([^&#]*)`);
			const splitQuery = regex.exec(this.search.playlist.query);

			if (!splitQuery) {
				return new Toast({
					content: "Please enter a valid YouTube playlist URL.",
					timeout: 4000
				});
			}

			// don't give starting import message instantly in case of instant error
			setTimeout(() => {
				if (isImportingPlaylist) {
					new Toast(
						"Starting to import your playlist. This can take some time to do."
					);
				}
			}, 750);

			return this.socket.dispatch(
				"playlists.addSetToPlaylist",
				this.search.playlist.query,
				this.playlist._id,
				this.search.playlist.isImportingOnlyMusic,
				res => {
					new Toast({ content: res.message, timeout: 20000 });
					if (res.status === "success") {
						isImportingPlaylist = false;
						if (this.search.playlist.isImportingOnlyMusic) {
							new Toast({
								content: `${res.data.stats.songsInPlaylistTotal} of the ${res.data.stats.videosInPlaylistTotal} videos in the playlist were songs.`,
								timeout: 20000
							});
						}
					}
				}
			);
		}
		// ...mapActions("modals/editSong", ["selectDiscogsInfo"])
	}
};
</script>

<style lang="scss" scoped>
.youtube-tab {
	#import-from-youtube-section {
		#playlist-import-type select {
			border-radius: 0;
		}

		#song-query-results {
			padding: 10px;
			margin-top: 10px;
			border: 1px solid var(--light-grey-3);
			border-radius: 3px;
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
}

@media screen and (max-width: 1300px) {
	.youtube-tab #song-query-results,
	.section {
		max-width: 100% !important;
	}
}
</style>
