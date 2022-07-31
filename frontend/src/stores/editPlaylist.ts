import { defineStore } from "pinia";

export const useEditPlaylistStore = props => {
	const { modalUuid } = props;
	return defineStore(`editPlaylist-${modalUuid}`, {
		state: () => ({
			playlistId: null,
			tab: "settings",
			playlist: { songs: [] }
		}),
		actions: {
			init({ playlistId }) {
				this.playlistId = playlistId;
			},
			showTab(tab) {
				this.tab = tab;
			},
			setPlaylist(playlist) {
				this.playlist = { ...playlist };
				this.playlist.songs.sort((a, b) => a.position - b.position);
			},
			clearPlaylist() {
				this.playlist = { songs: [] };
			},
			addSong(song) {
				this.playlist.songs.push(song);
			},
			removeSong(youtubeId) {
				this.playlist.songs = this.playlist.songs.filter(
					song => song.youtubeId !== youtubeId
				);
			},
			updatePlaylistSongs(playlistSongs) {
				this.playlist.songs = playlistSongs;
			},
			repositionedSong(song) {
				if (
					this.playlist.songs[song.newIndex] &&
					this.playlist.songs[song.newIndex].youtubeId ===
						song.youtubeId
				)
					return;

				this.playlist.songs.splice(
					song.newIndex,
					0,
					this.playlist.songs.splice(song.oldIndex, 1)[0]
				);
			}
		}
	})();
};
