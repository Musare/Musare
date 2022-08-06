import { defineStore } from "pinia";

export const useManageStationStore = props => {
	const { modalUuid } = props;
	if (!modalUuid || modalUuid === "") return false;
	return defineStore(`manageStation-${modalUuid}`, {
		state: () => ({
			stationId: null,
			sector: "admin",
			tab: "settings",
			station: {},
			stationPlaylist: { songs: [] },
			autofill: [],
			blacklist: [],
			songsList: [],
			stationPaused: true,
			currentSong: {}
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
			}
		}
	})();
};
