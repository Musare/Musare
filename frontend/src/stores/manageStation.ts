import { defineStore } from "pinia";
import { Station } from "@/types/station";
import { Playlist } from "@/types/playlist";
import { CurrentSong, Song } from "@/types/song";
import { useWebsocketsStore } from "@/stores/websockets";

export const useManageStationStore = props => {
	const { modalUuid } = props;
	if (!modalUuid) return null;
	return defineStore(`manageStation-${modalUuid}`, {
		state: () => ({
			stationId: null,
			sector: "admin",
			tab: "settings",
			station: <Station>{},
			stationPlaylist: <Playlist>{ songs: [] },
			autofill: <Playlist[]>[],
			blacklist: <Playlist[]>[],
			songsList: <Song[]>[],
			stationPaused: true,
			currentSong: <CurrentSong>{},
			permissions: {}
		}),
		actions: {
			init({ stationId, sector }) {
				this.stationId = stationId;
				if (sector) this.sector = sector;
			},
			showTab(tab) {
				this.tab = tab;
			},
			editStation(station) {
				this.station = JSON.parse(JSON.stringify(station));
			},
			setAutofillPlaylists(autofillPlaylists) {
				this.autofill = JSON.parse(JSON.stringify(autofillPlaylists));
			},
			setBlacklist(blacklist) {
				this.blacklist = JSON.parse(JSON.stringify(blacklist));
			},
			clearStation() {
				this.station = {};
				this.stationPlaylist = { songs: [] };
				this.autofill = [];
				this.blacklist = [];
				this.songsList = [];
				this.stationPaused = true;
				this.currentSong = {};
				this.permissions = {};
			},
			updateSongsList(songsList) {
				this.songsList = songsList;
			},
			updateStationPlaylist(stationPlaylist) {
				this.stationPlaylist = stationPlaylist;
			},
			repositionSongInList(song) {
				if (
					this.songsList[song.newIndex] &&
					this.songsList[song.newIndex].youtubeId === song.youtubeId
				)
					return;

				this.songsList.splice(
					song.newIndex,
					0,
					this.songsList.splice(song.oldIndex, 1)[0]
				);
			},
			updateStationPaused(stationPaused) {
				this.stationPaused = stationPaused;
			},
			updateCurrentSong(currentSong) {
				this.currentSong = currentSong;
			},
			updateStation(station) {
				this.station = { ...this.station, ...station };
			},
			updateIsFavorited(isFavorited) {
				this.station.isFavorited = isFavorited;
			},
			hasPermission(permission) {
				return !!(this.permissions && this.permissions[permission]);
			},
			updatePermissions() {
				return new Promise(resolve => {
					const { socket } = useWebsocketsStore();
					socket.dispatch(
						"utils.getPermissions",
						this.station._id,
						res => {
							this.permissions = res.data.permissions;
							resolve(this.permissions);
						}
					);
				});
			},
			addDj(user) {
				this.station.djs.push(user);
			},
			removeDj(user) {
				this.station.djs.forEach((dj, index) => {
					if (dj._id === user._id) {
						this.station.djs.splice(index, 1);
					}
				});
			}
		}
	})();
};
