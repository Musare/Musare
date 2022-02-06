<template>
	<modal title="Request Song">
		<template #body>
			<div class="vertical-padding">
				<!-- Choosing a song from youtube -->

				<h4 class="section-title">Choose a song</h4>
				<p class="section-description">
					Choose a song by searching or using a link from YouTube
				</p>

				<br />

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

				<!-- Choosing a song from youtube - query results -->

				<div
					id="song-query-results"
					v-if="youtubeSearch.songs.results.length > 0"
				>
					<search-query-item
						v-for="(result, index) in youtubeSearch.songs.results"
						:key="result.id"
						:result="result"
					>
						<template #actions>
							<transition
								name="search-query-actions"
								mode="out-in"
							>
								<i
									v-if="result.isRequested"
									key="added-to-playlist"
									class="material-icons icon-requested"
									content="Requested song"
									v-tippy
									>done</i
								>
								<i
									v-else
									@click.prevent="
										addSongToQueue(result.id, index)
									"
									key="add-to-queue"
									class="material-icons icon-request"
									content="Request song"
									v-tippy
									>add</i
								>
							</transition>
						</template>
					</search-query-item>

					<button
						class="button is-default load-more-button"
						@click.prevent="loadMoreSongs()"
					>
						Load more...
					</button>
				</div>

				<!-- Import a playlist from youtube -->

				<div v-if="station.type !== 'community'">
					<hr class="section-horizontal-rule" />

					<h4 class="section-title">Import a playlist</h4>
					<p class="section-description">
						Import a playlist by using a link from YouTube
					</p>

					<br />

					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="YouTube Playlist URL"
								v-model="youtubeSearch.playlist.query"
								@keyup.enter="importPlaylist()"
							/>
						</p>
						<p class="control has-addons">
							<span class="select" id="playlist-import-type">
								<select
									v-model="
										youtubeSearch.playlist
											.isImportingOnlyMusic
									"
								>
									<option :value="false">Import all</option>
									<option :value="true">
										Import only music
									</option>
								</select>
							</span>
							<button
								class="button is-info"
								@click.prevent="importPlaylist()"
							>
								<i class="material-icons icon-with-button"
									>publish</i
								>Import
							</button>
						</p>
					</div>
				</div>
			</div>
		</template>
	</modal>
</template>

<script>
import { mapState, mapGetters } from "vuex";

import Toast from "toasters";

import SearchYoutube from "@/mixins/SearchYoutube.vue";

import SearchQueryItem from "../SearchQueryItem.vue";
import Modal from "../Modal.vue";

export default {
	components: { Modal, SearchQueryItem },
	mixins: [SearchYoutube],
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			station: state => state.station.station
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		addSongToQueue(youtubeId, index) {
			if (this.station.type === "community") {
				this.socket.dispatch(
					"stations.addToQueue",
					this.station._id,
					youtubeId,
					res => {
						if (res.status !== "success")
							new Toast(`Error: ${res.message}`);
						else {
							this.youtubeSearch.songs.results[
								index
							].isRequested = true;

							new Toast(res.message);
						}
					}
				);
			} else {
				this.socket.dispatch("songs.request", youtubeId, false, res => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						this.youtubeSearch.songs.results[
							index
						].isRequested = true;

						new Toast(res.message);
					}
				});
			}
		},
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
				"songs.requestSet",
				this.youtubeSearch.playlist.query,
				this.youtubeSearch.playlist.isImportingOnlyMusic,
				false,
				res => {
					isImportingPlaylist = false;
					return new Toast({ content: res.message, timeout: 20000 });
				}
			);
		}
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	div {
		color: var(--dark-grey);
	}

	.icon-request {
		color: var(--white);
	}
}

.song-actions {
	.button {
		height: 36px;
		width: 140px;
	}
}

.song-thumbnail div {
	width: 96px;
	height: 54px;
	background-position: center;
	background-repeat: no-repeat;
}

.table {
	margin-bottom: 0;
	margin-top: 20px;
}

.vertical-padding {
	padding: 20px;
}

.icon-requested {
	color: var(--green);
}

.icon-request {
	color: var(--dark-gray-3);
}

#song-query-results {
	padding: 10px;
	max-height: 500px;
	overflow: auto;
	border: 1px solid var(--light-grey-3);
	border-radius: @border-radius;

	.search-query-item:not(:last-of-type) {
		margin-bottom: 10px;
	}

	.load-more-button {
		width: 100%;
		margin-top: 10px;
	}
}
</style>
