import { defineStore } from "pinia";

export const useImportAlbumStore = props => {
	const { modalUuid } = props;
	return defineStore(`importAlbum-${modalUuid}`, {
		state: () => ({
			discogsAlbum: {},
			originalPlaylistSongs: [],
			playlistSongs: [],
			editingSongs: false,
			discogsTab: "search",
			prefillDiscogs: false
		}),
		actions: {
			init({ songs }) {
				this.originalPlaylistSongs = JSON.parse(JSON.stringify(songs));
				this.playlistSongs = JSON.parse(JSON.stringify(songs));
			},
			showDiscogsTab(tab) {
				this.discogsTab = tab;
			},
			selectDiscogsAlbum(discogsAlbum) {
				this.discogsAlbum = JSON.parse(JSON.stringify(discogsAlbum));
				if (this.discogsAlbum && this.discogsAlbum.tracks) {
					this.tracks = this.discogsAlbum.tracks.map(track => ({
						...track,
						songs: []
					}));
				}
			},
			toggleDiscogsAlbum() {
				this.discogsAlbum.expanded = !this.discogsAlbum.expanded;
			},
			setPlaylistSongs(playlistSongs) {
				this.originalPlaylistSongs = JSON.parse(
					JSON.stringify(playlistSongs)
				);
				this.playlistSongs = JSON.parse(JSON.stringify(playlistSongs));
			},
			updatePlaylistSongs(playlistSongs) {
				this.playlistSongs = JSON.parse(JSON.stringify(playlistSongs));
			},
			updateEditingSongs(editingSongs) {
				this.editingSongs = editingSongs;
			},
			resetPlaylistSongs() {
				this.playlistSongs = JSON.parse(
					JSON.stringify(this.originalPlaylistSongs)
				);
			},
			updatePrefillDiscogs(updatedPrefill) {
				this.prefillDiscogs = updatedPrefill;
			},
			updatePlaylistSong(updatedSong) {
				this.playlistSongs.forEach((song, index) => {
					if (song._id === updatedSong._id)
						this.playlistSongs[index] = updatedSong;
				});
				this.originalPlaylistSongs.forEach((song, index) => {
					if (song._id === updatedSong._id)
						this.originalPlaylistSongs[index] = updatedSong;
				});
			}
		}
	})();
};
