<template>
	<div class="youtube-tab section">
		<label class="label"> Search for a playlist from YouTube </label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter YouTube Playlist URL here..."
					v-model="youtubeSearch.playlist.query"
					@keyup.enter="importPlaylist()"
				/>
			</p>
			<p class="control has-addons">
				<span class="select" id="playlist-import-type">
					<select
						v-model="youtubeSearch.playlist.isImportingOnlyMusic"
					>
						<option :value="false">Import all</option>
						<option :value="true">Import only music</option>
					</select>
				</span>
				<button
					class="button is-info"
					@click.prevent="importPlaylist()"
				>
					<i class="material-icons icon-with-button">publish</i>Import
				</button>
			</p>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import Toast from "toasters";

import SearchYoutube from "@/mixins/SearchYoutube.vue";

export default {
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
	methods: {
		importPlaylist() {
			let isImportingPlaylist = true;

			// import query is blank
			if (!this.youtubeSearch.playlist.query)
				return new Toast("Please enter a YouTube playlist URL.");

			const regex = /`[\\?&]list=([^&#]*)`/;
			const splitQuery = regex.exec(this.youtubeSearch.playlist.query);

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
				this.youtubeSearch.playlist.query,
				this.playlist._id,
				this.youtubeSearch.playlist.isImportingOnlyMusic,
				res => {
					new Toast({ content: res.message, timeout: 20000 });
					if (res.status === "success") {
						isImportingPlaylist = false;

						const {
							songsInPlaylistTotal,
							videosInPlaylistTotal,
							alreadyInLikedPlaylist,
							alreadyInDislikedPlaylist
						} = res.data.stats;

						if (this.youtubeSearch.playlist.isImportingOnlyMusic) {
							new Toast({
								content: `${songsInPlaylistTotal} of the ${videosInPlaylistTotal} videos in the playlist were songs.`,
								timeout: 20000
							});
						}
						if (
							alreadyInLikedPlaylist > 0 ||
							alreadyInDislikedPlaylist > 0
						) {
							let message = "";
							if (alreadyInLikedPlaylist > 0) {
								message = `${alreadyInLikedPlaylist} songs were already in your Liked Songs playlist. A song cannot be in both the Liked Songs playlist and the Disliked Songs playlist at the same time.`;
							} else {
								message = `${alreadyInDislikedPlaylist} songs were already in your Disliked Songs playlist. A song cannot be in both the Liked Songs playlist and the Disliked Songs playlist at the same time.`;
							}
							new Toast({
								content: message,
								timeout: 20000
							});
						}
					}
				}
			);
		}
	}
};
</script>

<style lang="less" scoped>
#playlist-import-type select {
	border-radius: 0;
}

@media screen and (max-width: 1300px) {
	.youtube-tab #song-query-results,
	.section {
		max-width: 100% !important;
	}
}
</style>
