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
			reorderSongsList(songsOrder) {
				this.playlist.songs.sort((songA, songB) => {
					const indexA = songsOrder.findIndex(
						mediaSource => mediaSource === songA.mediaSource
					);
					const indexB = songsOrder.findIndex(
						mediaSource => mediaSource === songB.mediaSource
					);
					if (indexA > indexB) return 1;
					if (indexA < indexB) return -1;
					return 0;
				});
			}
		}
	})();
