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
import { mapGetters } from "vuex";
import Toast from "toasters";

import { mapModalState } from "@/vuex_helpers";
import SearchYoutube from "@/mixins/SearchYoutube.vue";

export default {
	mixins: [SearchYoutube],
	props: {
		modalUuid: { type: String, default: "" }
	},
	data() {
		return {};
	},
	computed: {
		...mapModalState("modals/editPlaylist/MODAL_UUID", {
			playlist: state => state.playlist
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		importPlaylist() {
			let id;
			let title;

			// import query is blank
			if (!this.youtubeSearch.playlist.query)
				return new Toast("Please enter a YouTube playlist URL.");

			const regex = /[\\?&]list=([^&#]*)/;
			const splitQuery = regex.exec(this.youtubeSearch.playlist.query);

			if (!splitQuery) {
				return new Toast({
					content: "Please enter a valid YouTube playlist URL.",
					timeout: 4000
				});
			}

			return this.socket.dispatch(
				"playlists.addSetToPlaylist",
				this.youtubeSearch.playlist.query,
				this.playlist._id,
				this.youtubeSearch.playlist.isImportingOnlyMusic,
				{
					cb: () => {},
					onProgress: res => {
						if (res.status === "started") {
							id = res.id;
							title = res.title;
						}

						if (id)
							this.setJob({
								id,
								name: title,
								...res
							});
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
