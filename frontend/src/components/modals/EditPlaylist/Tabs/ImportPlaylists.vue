<script setup lang="ts">
import { useStore } from "vuex";
import { computed } from "vue";
import Toast from "toasters";
import { useModalState } from "@/vuex_helpers";
import useSearchYoutube from "@/composables/useSearchYoutube";

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const store = useStore();

const { socket } = store.state.websockets;

const modalState = useModalState("modals/editPlaylist/MODAL_UUID", {
	modalUuid: props.modalUuid
});
const playlist = computed(() => modalState.playlist);

const setJob = payload => store.dispatch("longJobs/setJob", payload);

const { youtubeSearch } = useSearchYoutube();

const importPlaylist = () => {
	let id;
	let title;

	// import query is blank
	if (!youtubeSearch.value.playlist.query)
		return new Toast("Please enter a YouTube playlist URL.");

	const regex = /[\\?&]list=([^&#]*)/;
	const splitQuery = regex.exec(youtubeSearch.value.playlist.query);

	if (!splitQuery) {
		return new Toast({
			content: "Please enter a valid YouTube playlist URL.",
			timeout: 4000
		});
	}

	return socket.dispatch(
		"playlists.addSetToPlaylist",
		youtubeSearch.value.playlist.query,
		playlist.value._id,
		youtubeSearch.value.playlist.isImportingOnlyMusic,
		{
			cb: () => {},
			onProgress: res => {
				if (res.status === "started") {
					id = res.id;
					title = res.title;
				}

				if (id)
					setJob({
						id,
						name: title,
						...res
					});
			}
		}
	);
};
</script>

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
