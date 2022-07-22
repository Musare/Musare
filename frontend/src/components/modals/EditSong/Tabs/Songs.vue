<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted } from "vue";

import { useModalState } from "@/vuex_helpers";

import { useSearchMusare } from "@/composables/useSearchMusare";

const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" },
	modalModulePath: { type: String, default: "modals/editSong/MODAL_UUID" }
});

const sitename = ref("Musare");

const { song } = useModalState("MODAL_MODULE_PATH", {
	modalUuid: props.modalUuid,
	modalModulePath: props.modalModulePath
});

const {
	musareSearch,
	resultsLeftCount,
	nextPageResultsCount,
	searchForMusareSongs
} = useSearchMusare();

onMounted(async () => {
	sitename.value = await lofig.get("siteSettings.sitename");

	musareSearch.value.query = song.title;
	searchForMusareSongs(1, false);
});
</script>

<template>
	<div class="musare-songs-tab">
		<label class="label"> Search for a song on {{ sitename }} </label>
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
				v-for="result in musareSearch.results"
				:key="result._id"
				:song="result"
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

<style lang="less" scoped>
.musare-songs-tab #song-query-results {
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
