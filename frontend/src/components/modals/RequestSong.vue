<template>
	<modal title="Request Song">
		<template #body>
			<div class="vertical-padding">
				<!-- Choosing a song from youtube -->

				<h4 class="section-title">Choose a song</h4>
				<p class="section-description">
					Choose a song by searching or using a link from YouTube.
				</p>

				<br />

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
							><i class="material-icons icon-with-button"
								>search</i
							>Search</a
						>
					</p>
				</div>

				<!-- Choosing a song from youtube - query results -->

				<div
					id="song-query-results"
					v-if="search.songs.results.length > 0"
				>
					<search-query-item
						v-for="(result, index) in search.songs.results"
						:key="result.id"
						:result="result"
					>
						<template #actions>
							<transition
								name="search-query-actions"
								mode="out-in"
							>
								<a
									class="button is-success"
									v-if="result.isAddedToQueue"
									href="#"
									key="added-to-playlist"
								>
									<i class="material-icons icon-with-button"
										>done</i
									>
									Added to queue
								</a>
								<a
									class="button is-dark"
									v-else
									@click.prevent="
										addSongToQueue(result.id, index)
									"
									href="#"
									key="add-to-queue"
								>
									<i class="material-icons icon-with-button"
										>add</i
									>
									Add to queue
								</a>
							</transition>
						</template>
					</search-query-item>

					<a
						class="button is-default load-more-button"
						@click.prevent="loadMoreSongs()"
						href="#"
					>
						Load more...
					</a>
				</div>

				<!-- Import a playlist from youtube -->

				<div v-if="station.type === 'official'">
					<hr class="section-horizontal-rule" />

					<h4 class="section-title">Import a playlist</h4>
					<p class="section-description">
						Import a playlist by using a link from YouTube.
					</p>

					<br />

					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="YouTube Playlist URL"
								v-model="search.playlist.query"
								@keyup.enter="importPlaylist()"
							/>
						</p>
						<p class="control has-addons">
							<span class="select" id="playlist-import-type">
								<select
									v-model="
										search.playlist.isImportingOnlyMusic
									"
								>
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
								><i class="material-icons icon-with-button"
									>publish</i
								>Import</a
							>
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
							this.search.songs.results[
								index
							].isAddedToQueue = true;

							new Toast(res.message);
						}
					}
				);
			} else {
				this.socket.dispatch("songs.request", youtubeId, false, res => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						this.search.songs.results[index].isAddedToQueue = true;

						new Toast(res.message);
					}
				});
			}
		},
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
				"songs.requestSet",
				this.search.playlist.query,
				this.search.playlist.isImportingOnlyMusic,
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

<style lang="scss" scoped>
.night-mode {
	div {
		color: var(--dark-grey);
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

#song-query-results {
	padding: 10px;
	max-height: 500px;
	overflow: auto;
	border: 1px solid var(--light-grey-3);
	border-radius: 3px;

	.search-query-item:not(:last-of-type) {
		margin-bottom: 10px;
	}

	.load-more-button {
		width: 100%;
		margin-top: 10px;
	}
}
</style>
