import { defineStore } from "pinia";
import { Playlist } from "@/types/playlist";

export const useUserPlaylistsStore = defineStore("userPlaylists", {
	state: () => ({
		playlists: <Playlist[]>[]
	}),
	actions: {
		setPlaylists(playlists) {
			this.playlists = playlists;
		},
		updatePlaylists(playlists) {
			this.playlists = playlists;
		},
		addPlaylist(playlist) {
			this.playlists.push(playlist);
		},
		removePlaylist(playlistId) {
			this.playlists.forEach((playlist, index) => {
				if (playlist._id === playlistId)
					this.playlists.splice(index, 1);
			});
		}
	}
});
