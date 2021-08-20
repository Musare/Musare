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
						@click.prevent="updateYoutubeId(result.id)"
						key="not-selected"
						>radio_button_unchecked
					</i>
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
import { mapGetters, mapState, mapActions } from "vuex";

import SearchYoutube from "@/mixins/SearchYoutube.vue";

import SearchQueryItem from "../../../SearchQueryItem.vue";

export default {
	components: { SearchQueryItem },
	mixins: [SearchYoutube],
	data() {
		return {};
	},
	computed: {
		...mapState("modals/editSong", {
			song: state => state.song
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		...mapActions("modals/editSong", ["updateYoutubeId"])
	}
};
</script>

<style lang="scss" scoped>
.youtube-tab {
	#song-query-results {
		height: calc(100% - 74px);
		max-height: 740px;
		overflow: auto;

		.search-query-item {
			/deep/ .thumbnail-and-info {
				width: calc(100% - 29px);
				max-width: 500px;
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
