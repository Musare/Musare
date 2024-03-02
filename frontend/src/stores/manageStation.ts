import { defineStore } from "pinia";
import { Station } from "@/types/station";
import { Playlist } from "@/types/playlist";
import { CurrentSong, Song } from "@/types/song";
import { useWebsocketsStore } from "@/stores/websockets";

export const useManageStationStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`manageStation-${modalUuid}`, {
		state: (): {
			stationId: string;
			sector: "station" | "home" | "admin";
			tab: "settings" | "request" | "autofill" | "blacklist";
			station: Station;
			stationPlaylist: Playlist;
			autofill: Playlist[];
			blacklist: Playlist[];
			songsList: Song[];
			stationPaused: boolean;
			currentSong: CurrentSong;
			permissions: Record<string, boolean>;
		} => ({
			stationId: null,
			sector: "admin",
			tab: "settings",
			station: {},
			stationPlaylist: { songs: [] },
			autofill: [],
			blacklist: [],
			songsList: [],
			stationPaused: true,
			currentSong: {},
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
			reorderSongsList(songsOrder) {
				this.songsList.sort((songA, songB) => {
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
