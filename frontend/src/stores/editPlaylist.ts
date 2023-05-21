import { defineStore } from "pinia";
import { Playlist } from "@/types/playlist";

export const useEditPlaylistStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`editPlaylist-${modalUuid}`, {
		state: (): {
			tab: string;
			playlist: Playlist;
		} => ({
			tab: "settings",
			playlist: { songs: [] }
		}),
		actions: {
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
			removeSong(mediaSource) {
				this.playlist.songs = this.playlist.songs.filter(
					song => song.mediaSource !== mediaSource
				);
			},
			replaceSong({ song, oldMediaSource }) {
				this.playlist.songs = this.playlist.songs.map(_song =>
					_song.mediaSource === oldMediaSource ? song : _song
				);
			},
			updatePlaylistSongs(playlistSongs) {
				this.playlist.songs = playlistSongs;
			},
			repositionedSong(song) {
				if (
					this.playlist.songs[song.newIndex] &&
					this.playlist.songs[song.newIndex].mediaSource ===
						song.mediaSource
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
