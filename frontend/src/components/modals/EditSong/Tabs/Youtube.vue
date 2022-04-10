<template>
	<div class="youtube-tab">
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
					<i class="material-icons icon-with-button">search</i>Search
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
						v-if="result.id === song.youtubeId"
						key="selected"
						>radio_button_checked
					</i>
					<i
						class="material-icons icon-not-selected"
						v-else
						@click.prevent="selectSong(result)"
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
</template>

<script>
import { mapGetters } from "vuex";

import { mapModalState, mapModalActions } from "@/vuex_helpers";

import SearchYoutube from "@/mixins/SearchYoutube.vue";

import SearchQueryItem from "../../../SearchQueryItem.vue";

export default {
	components: { SearchQueryItem },
	mixins: [SearchYoutube],
	props: {
		modalUuid: { type: String, default: "" }
	},
	data() {
		return {};
	},
	computed: {
		...mapModalState("modals/editSong/MODAL_UUID", {
			song: state => state.song,
			newSong: state => state.newSong
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		selectSong(result) {
			this.updateYoutubeId(result.id);

			if (this.newSong) {
				this.updateTitle(result.title);
				this.updateThumbnail(result.thumbnail);
			}
		},
		...mapModalActions("modals/editSong/MODAL_UUID", [
			"updateYoutubeId",
			"updateTitle",
			"updateThumbnail"
		])
	}
};
</script>

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
