import { defineStore } from "pinia";
import { Playlist } from "@/types/playlist";

export const useUserPlaylistsStore = defineStore("userPlaylists", {
	state: (): {
		playlists: Playlist[];
	} => ({
		playlists: []
	}),
	actions: {
		setPlaylists(playlists: Playlist[]) {
			this.playlists = playlists;
		},
		updatePlaylists(playlists: Playlist[]) {
			this.playlists = playlists;
		},
		addPlaylist(playlist: Playlist) {
			this.playlists.push(playlist);
		},
		removePlaylist(playlistId: string) {
			this.playlists.forEach((playlist, index) => {
				if (playlist._id === playlistId)
					this.playlists.splice(index, 1);
			});
		}
	}
});
