<script setup lang="ts">
import { ref, onMounted } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserPlaylistsStore } from "@/stores/userPlaylists";
import { useModalsStore } from "@/stores/modals";

const props = defineProps({
	song: {
		type: Object,
		default: () => {}
	},
	placement: {
		type: String,
		default: "left"
	}
});

const emit = defineEmits(["showPlaylistDropdown"]);

const dropdown = ref(null);

const { socket } = useWebsocketsStore();
const userPlaylistsStore = useUserPlaylistsStore();

const { playlists, fetchedPlaylists } = storeToRefs(userPlaylistsStore);
const { setPlaylists, addPlaylist, removePlaylist } = userPlaylistsStore;

const { openModal } = useModalsStore();

const init = () => {
	if (!fetchedPlaylists.value)
		socket.dispatch("playlists.indexMyPlaylists", res => {
			if (res.status === "success")
				if (!fetchedPlaylists.value) setPlaylists(res.data.playlists);
		});
};
const hasSong = playlist =>
	playlist.songs.map(song => song.youtubeId).indexOf(props.song.youtubeId) !==
	-1;
const toggleSongInPlaylist = playlistIndex => {
	const playlist = playlists.value[playlistIndex];
	if (!hasSong(playlist)) {
		socket.dispatch(
			"playlists.addSongToPlaylist",
			false,
			props.song.youtubeId,
			playlist._id,
			res => new Toast(res.message)
		);
	} else {
		socket.dispatch(
			"playlists.removeSongFromPlaylist",
			props.song.youtubeId,
			playlist._id,
			res => new Toast(res.message)
		);
	}
};
const createPlaylist = () => {
	dropdown.value.tippy.setProps({
		zIndex: 0,
		hideOnClick: false
	});

	window.addToPlaylistDropdown = dropdown.value;

	openModal("createPlaylist");
};

onMounted(() => {
	socket.onConnect(init);

	socket.on("event:playlist.created", res => addPlaylist(res.data.playlist), {
		replaceable: true
	});

	socket.on(
		"event:playlist.deleted",
		res => removePlaylist(res.data.playlistId),
		{ replaceable: true }
	);

	socket.on(
		"event:playlist.displayName.updated",
		res => {
			playlists.value.forEach((playlist, index) => {
				if (playlist._id === res.data.playlistId) {
					playlists.value[index].displayName = res.data.displayName;
				}
			});
		},
		{ replaceable: true }
	);
});
</script>

<template>
	<tippy
		class="addToPlaylistDropdown"
		:touch="true"
		:interactive="true"
		:placement="placement"
		theme="dropdown"
		ref="dropdown"
		trigger="click"
		append-to="parent"
		@show="emit('showPlaylistDropdown', true)"
		@hide="emit('showPlaylistDropdown', false)"
	>
		<slot name="button" ref="trigger" />

		<template #content>
			<div class="nav-dropdown-items" v-if="playlists.length > 0">
				<button
					class="nav-item"
					v-for="(playlist, index) in playlists"
					:key="playlist._id"
					@click.prevent="toggleSongInPlaylist(index)"
					:title="playlist.displayName"
				>
					<p class="control is-expanded checkbox-control">
						<label class="switch">
							<input
								type="checkbox"
								:id="`${index}`"
								:checked="hasSong(playlist)"
								@click="toggleSongInPlaylist(index)"
							/>
							<span class="slider round"></span>
						</label>
						<label :for="`${index}`">
							<span></span>
							<p>{{ playlist.displayName }}</p>
						</label>
					</p>
				</button>
			</div>
			<p v-else class="no-playlists">
				You haven't created any playlists.
			</p>

			<button
				id="create-playlist"
				class="button is-primary"
				@click="createPlaylist()"
			>
				<i class="material-icons icon-with-button"> edit </i>
				Create Playlist
			</button>
		</template>
	</tippy>
</template>

<style lang="less" scoped>
.no-playlists {
	text-align: center;
	margin-top: 10px;
}

#create-playlist .material-icons {
	color: var(--white);
}
</style>
