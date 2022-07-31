import { defineStore } from "pinia";

export const useUserPlaylistsStore = defineStore("userPlaylists", {
	state: () => ({
		playlists: [],
		fetchedPlaylists: false
	}),
	actions: {
		setPlaylists(playlists) {
			this.fetchedPlaylists = true;
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
