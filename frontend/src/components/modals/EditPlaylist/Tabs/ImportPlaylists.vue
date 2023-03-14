<script setup lang="ts">
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { useSearchYoutube } from "@/composables/useSearchYoutube";
import { useSearchSoundcloud } from "@/composables/useSearchSoundcloud";
import { useSearchSpotify } from "@/composables/useSearchSpotify";
import { useWebsocketsStore } from "@/stores/websockets";
import { useLongJobsStore } from "@/stores/longJobs";
import { useEditPlaylistStore } from "@/stores/editPlaylist";

const props = defineProps({
	modalUuid: { type: String, required: true }
});

const { socket } = useWebsocketsStore();

const editPlaylistStore = useEditPlaylistStore({ modalUuid: props.modalUuid });
const { playlist } = storeToRefs(editPlaylistStore);

const { setJob } = useLongJobsStore();

const { youtubeSearch } = useSearchYoutube();
const { soundcloudSearch } = useSearchSoundcloud();
const { spotifySearch } = useSearchSpotify();

const importMusarePlaylistFileInput = ref();
const importMusarePlaylistFileContents = ref(null);

const importYoutubePlaylist = () => {
	let id;
	let title;

	// import query is blank
	if (!youtubeSearch.value.playlist.query)
		return new Toast("Please enter a YouTube playlist URL.");

	const playlistRegex = /[\\?&]list=([^&#]*)/;
	const channelRegex =
		/\.[\w]+\/(?:(?:channel\/(UC[0-9A-Za-z_-]{21}[AQgw]))|(?:user\/?([\w-]+))|(?:c\/?([\w-]+))|(?:\/?([\w-]+)))/;

	if (
		!playlistRegex.exec(youtubeSearch.value.playlist.query) &&
		!channelRegex.exec(youtubeSearch.value.playlist.query)
	) {
		return new Toast({
			content: "Please enter a valid YouTube playlist URL.",
			timeout: 4000
		});
	}

	return socket.dispatch(
		"playlists.addYoutubeSetToPlaylist",
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

const importSoundcloudPlaylist = () => {
	let id;
	let title;
	// import query is blank
	if (!soundcloudSearch.value.playlist.query)
		return new Toast("Please enter a SoundCloud playlist URL.");

	return socket.dispatch(
		"playlists.addSoundcloudSetToPlaylist",
		soundcloudSearch.value.playlist.query,
		playlist.value._id,
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

const importSpotifyPlaylist = () => {
	let id;
	let title;
	// import query is blank
	if (!spotifySearch.value.playlist.query)
		return new Toast("Please enter a Spotify playlist URL.");

	return socket.dispatch(
		"playlists.addSpotifySetToPlaylist",
		spotifySearch.value.playlist.query,
		playlist.value._id,
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

const onMusarePlaylistFileChange = () => {
	const reader = new FileReader();
	const fileInput = importMusarePlaylistFileInput.value as HTMLInputElement;
	const file = fileInput.files.item(0);

	reader.readAsText(file, "UTF-8");
	reader.onload = ({ target }) => {
		const { result } = target;

		try {
			const parsed = JSON.parse(result.toString());

			if (!parsed)
				new Toast(
					"An error occured whilst parsing the playlist file. Is it valid?"
				);
			else importMusarePlaylistFileContents.value = parsed;
		} catch (err) {
			new Toast(
				"An error occured whilst parsing the playlist file. Is it valid?"
			);
		}
	};

	reader.onerror = evt => {
		console.log(evt);
		new Toast(
			"An error occured whilst reading the playlist file. Is it valid?"
		);
	};
};

const importMusarePlaylistFile = () => {
	let id;
	let title;

	let mediaSources = [];

	if (!importMusarePlaylistFileContents.value)
		return new Toast("Please choose a Musare playlist file first.");

	if (importMusarePlaylistFileContents.value.playlist) {
		mediaSources =
			importMusarePlaylistFileContents.value.playlist.songs.map(song =>
				song.youtubeId ? `youtube:${song.youtubeId}` : song.mediaSource
			);
	} else if (importMusarePlaylistFileContents.value.songs) {
		mediaSources = importMusarePlaylistFileContents.value.songs.map(song =>
			song.youtubeId ? `youtube:${song.youtubeId}` : song.mediaSource
		);
	}

	if (mediaSources.length === 0) return new Toast("No songs to import.");

	return socket.dispatch(
		"playlists.addSongsToPlaylist",
		playlist.value._id,
		mediaSources,
		{
			cb: res => {
				new Toast(res.message);
			},
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
	<div class="import-playlist-tab section">
		<label class="label"> Import songs from YouTube playlist </label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter YouTube Playlist URL here..."
					v-model="youtubeSearch.playlist.query"
					@keyup.enter="importYoutubePlaylist()"
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
					@click.prevent="importYoutubePlaylist()"
				>
					<i class="material-icons icon-with-button">publish</i>Import
				</button>
			</p>
		</div>

		<label class="label"> Import songs from SoundCloud playlist </label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter SoundCloud Playlist URL here..."
					v-model="soundcloudSearch.playlist.query"
					@keyup.enter="importSoundcloudPlaylist()"
				/>
			</p>
			<p class="control has-addons">
				<button
					class="button is-info"
					@click.prevent="importSoundcloudPlaylist()"
				>
					<i class="material-icons icon-with-button">publish</i>Import
				</button>
			</p>
		</div>

		<label class="label"> Import songs from Spotify playlist </label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter Spotify Playlist URL here..."
					v-model="spotifySearch.playlist.query"
					@keyup.enter="importSpotifyPlaylist()"
				/>
			</p>
			<p class="control has-addons">
				<button
					class="button is-info"
					@click.prevent="importSpotifyPlaylist()"
				>
					<i class="material-icons icon-with-button">publish</i>Import
				</button>
			</p>
		</div>

		<label class="label"> Import songs from a Musare playlist file </label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="file"
					placeholder="Enter YouTube Playlist URL here..."
					@change="onMusarePlaylistFileChange"
					ref="importMusarePlaylistFileInput"
					@keyup.enter="importMusarePlaylistFile()"
				/>
			</p>
			<p class="control">
				<button
					class="button is-info"
					@click.prevent="importMusarePlaylistFile()"
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

input[type="file"] {
	padding-left: 0;
}

input[type="file"]::file-selector-button {
	background: var(--light-grey);
	border: none;
	height: 100%;
	border-right: 1px solid var(--light-grey-3);
	margin-right: 8px;
	padding: 0 8px;
	cursor: pointer;
}

input[type="file"]::file-selector-button:hover {
	background: var(--light-grey-2);
}

@media screen and (max-width: 1300px) {
	.import-playlist-tab #song-query-results,
	.section {
		max-width: 100% !important;
	}
}
</style>
