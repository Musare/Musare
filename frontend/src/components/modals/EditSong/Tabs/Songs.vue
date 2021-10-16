<template>
	<div class="musare-songs-tab">
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
				:disabled-actions="['addToPlaylist', 'edit']"
			/>
			<button
				v-if="resultsLeftCount > 0"
				class="button is-primary load-more-button"
				@click="searchForMusareSongs(musareSearch.page + 1)"
			>
				Load {{ nextPageResultsCount }} more results
			</button>
		</div>
	</div>
</template>

<script>
import { mapState } from "vuex";

import SearchMusare from "@/mixins/SearchMusare.vue";

import SongItem from "@/components/SongItem.vue";

export default {
	components: {
		SongItem
	},
	mixins: [SearchMusare],
	data() {
		return {};
	},
	computed: {
		...mapState("modals/editSong", {
			song: state => state.song
		})
	},
	mounted() {
		this.musareSearch.query = this.song.title;
		this.searchForMusareSongs(1);
	}
};
</script>

<style lang="scss" scoped>
.musare-songs-tab {
	height: calc(100% - 32px);

	#song-query-results {
		height: calc(100% - 74px);
		overflow: auto;

		.search-query-item {
			/deep/ .thumbnail-and-info {
				width: calc(100% - 57px);
			}

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
}
</style>
