<script lang="ts" setup>
import { defineAsyncComponent, ref } from "vue";
import {
	AddSongToPlaylistResponse,
	RemoveSongFromPlaylistResponse
} from "@musare_types/actions/PlaylistsActions";
import Toast from "toasters";
import { PlaylistModel } from "@musare_types/models/Playlist";
import { storeToRefs } from "pinia";
import { Song } from "@/types/song";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserPlaylistsStore } from "@/pages/NewStation/stores/userPlaylists";
import { useModalsStore } from "@/stores/modals";
import Checkbox from "@/pages/NewStation/Components/Checkbox.vue";
import DropdownListItem from "@/pages/NewStation/Components/DropdownListItem.vue";

const DropdownList = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/DropdownList.vue")
);

const props = defineProps<{
	media: Song;
}>();

const { openModal } = useModalsStore();
const userPlaylistsStore = useUserPlaylistsStore();
const { playlists } = storeToRefs(userPlaylistsStore);
const { socket } = useWebsocketsStore();

const dropdown = ref();

const existsInPlaylist = (playlist: PlaylistModel & { weight: number }) =>
	!!playlist.songs.find(
		media => media.mediaSource === props.media.mediaSource
	);

const addToPlaylist = (playlist: PlaylistModel & { weight: number }) => {
	socket.dispatch(
		"playlists.addSongToPlaylist",
		false,
		props.media.mediaSource,
		playlist._id,
		(res: AddSongToPlaylistResponse) => new Toast(res.message)
	);
};

const removeFromPlaylist = (playlist: PlaylistModel & { weight: number }) => {
	socket.dispatch(
		"playlists.removeSongFromPlaylist",
		props.media.mediaSource,
		playlist._id,
		(res: RemoveSongFromPlaylistResponse) => new Toast(res.message)
	);
};

const toggleInPlaylist = (playlist: PlaylistModel & { weight: number }) => {
	if (existsInPlaylist(playlist)) removeFromPlaylist(playlist);
	else addToPlaylist(playlist);
};

const createPlaylist = () => {
	dropdown.value.collapse();

	openModal("createPlaylist");
};
</script>

<template>
	<DropdownList ref="dropdown">
		<slot />

		<template #options>
			<DropdownListItem
				icon="edit"
				label="Create playlist"
				@click="createPlaylist"
			/>
			<DropdownListItem
				v-for="playlist in playlists"
				:key="`playlist-${playlist._id}`"
			>
				<label class="dropdown-list-item__action">
					<Checkbox
						:model-value="existsInPlaylist(playlist)"
						@click.prevent="toggleInPlaylist(playlist)"
					/>
					{{ playlist.displayName }}
				</label>
			</DropdownListItem>
		</template>
	</DropdownList>
</template>
