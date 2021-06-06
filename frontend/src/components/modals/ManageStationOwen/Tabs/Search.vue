<template>
	<div class="search">
		<div class="musare-search">
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
			<div v-if="musareSearch.results.length > 0">
				<song-item
					v-for="song in musareSearch.results"
					:key="song._id"
					:song="song"
				>
					<template #actions>
						<div class="icons-group">
							<i
								class="material-icons add-to-queue-icon"
								v-if="station.partyMode && !station.locked"
								@click="addSongToQueue(song.youtubeId)"
								content="Add Song to Queue"
								v-tippy
								>queue</i
							>
						</div>
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
		<div class="youtube-search">
			<label class="label"> Search for a song on YouTube </label>
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
					<a class="button is-info" @click.prevent="searchForSongs()"
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
								key="added-to-queue"
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
					class="button is-primary load-more-button"
					@click.prevent="loadMoreSongs()"
				>
					Load more...
				</a>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters } from "vuex";

import Toast from "toasters";
import SearchYoutube from "@/mixins/SearchYoutube.vue";

import SongItem from "@/components/SongItem.vue";
import SearchQueryItem from "../../../SearchQueryItem.vue";

export default {
	components: {
		SongItem,
		SearchQueryItem
	},
	mixins: [SearchYoutube],
	data() {
		return {
			musareSearch: {
				query: "",
				searchedQuery: "",
				page: 0,
				count: 0,
				resultsLeft: 0,
				results: []
			}
		};
	},
	computed: {
		resultsLeftCount() {
			return this.musareSearch.count - this.musareSearch.results.length;
		},
		nextPageResultsCount() {
			return Math.min(this.musareSearch.pageSize, this.resultsLeftCount);
		},
		...mapState("modals/manageStation", {
			station: state => state.station,
			originalStation: state => state.originalStation
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
							if (index)
								this.search.songs.results[
									index
								].isAddedToQueue = true;

							new Toast(res.message);
						}
					}
				);
			} else {
				this.socket.dispatch("songs.request", youtubeId, res => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						this.search.songs.results[index].isAddedToQueue = true;

						new Toast(res.message);
					}
				});
			}
		},
		searchForMusareSongs(page) {
			if (
				this.musareSearch.page >= page ||
				this.musareSearch.searchedQuery !== this.musareSearch.query
			) {
				this.musareSearch.results = [];
				this.musareSearch.page = 0;
				this.musareSearch.count = 0;
				this.musareSearch.resultsLeft = 0;
				this.musareSearch.pageSize = 0;
			}

			this.musareSearch.searchedQuery = this.musareSearch.query;
			this.socket.dispatch(
				"songs.searchOfficial",
				this.musareSearch.query,
				page,
				res => {
					const { data } = res;
					const { count, pageSize, songs } = data;
					if (res.status === "success") {
						this.musareSearch.results = [
							...this.musareSearch.results,
							...songs
						];
						this.musareSearch.page = page;
						this.musareSearch.count = count;
						this.musareSearch.resultsLeft =
							count - this.musareSearch.results.length;
						this.musareSearch.pageSize = pageSize;
					} else if (res.status === "error") {
						this.musareSearch.results = [];
						this.musareSearch.page = 0;
						this.musareSearch.count = 0;
						this.musareSearch.resultsLeft = 0;
						this.musareSearch.pageSize = 0;
						new Toast(res.message);
					}
				}
			);
		}
	}
};
</script>

<style lang="scss">
.search {
	.musare-search,
	.universal-item:not(:last-of-type) {
		margin-bottom: 10px;
	}
	.load-more-button {
		width: 100%;
		margin-top: 10px;
	}
}
</style>
