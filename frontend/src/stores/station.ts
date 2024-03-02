import { defineStore, storeToRefs } from "pinia";
import { Playlist } from "@/types/playlist";
import { Song, CurrentSong } from "@/types/song";
import { Station } from "@/types/station";
import { User } from "@/types/user";
import { StationHistory } from "@/types/stationHistory";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserPreferencesStore } from "@/stores/userPreferences";
import { useConfigStore } from "@/stores/config";
import { useSortablePlaylists } from "@/composables/useSortablePlaylists";

const userPreferencesStore = useUserPreferencesStore();
const configStore = useConfigStore();

const { autoSkipDisliked } = storeToRefs(userPreferencesStore);
const { experimental } = storeToRefs(configStore);

const { playlists } = useSortablePlaylists();

export const useStationStore = defineStore("station", {
	state: (): {
		station: Station;
		autoRequest: Playlist[];
		autoRequestLock: boolean;
		userCount: number;
		users: {
			loggedIn: User[];
			loggedOut: User[];
		};
		currentSong: CurrentSong | undefined;
		nextSong: Song | undefined | null;
		songsList: Song[];
		stationPaused: boolean;
		localPaused: boolean;
		noSong: boolean;
		autofill: Playlist[];
		blacklist: Playlist[];
		mediaModalPlayingAudio: boolean;
		permissions: Record<string, boolean>;
		history: StationHistory[];
	} => ({
		station: {},
		autoRequest: [],
		autoRequestLock: false,
		userCount: 0,
		users: {
			loggedIn: [],
			loggedOut: []
		},
		currentSong: {},
		nextSong: null,
		songsList: [],
		stationPaused: true,
		localPaused: false,
		noSong: true,
		autofill: [],
		blacklist: [],
		mediaModalPlayingAudio: false,
		permissions: {},
		history: []
	}),
	getters: {
		dislikedPlaylist() {
			return playlists.value.find(
				playlist => playlist.type === "user-disliked"
			);
		},
		// List of media sources that will not be allowed to be autorequested
		autorequestExcludedMediaSources() {
			const mediaSources = new Set();

			// Exclude the current song
			if (this.currentSong && this.currentSong.mediaSource)
				mediaSources.add(this.currentSong.mediaSource);

			// Exclude songs in the queue
			if (this.songsList) {
				this.songsList.forEach(song => {
					mediaSources.add(song.mediaSource);
				});
			}

			// If auto skip disliked preference is enabled, exclude all songs in the disliked playlist
			if (autoSkipDisliked.value && this.dislikedPlaylist) {
				this.dislikedPlaylist.songs.forEach(song => {
					mediaSources.add(song.mediaSource);
				});
			}

			// If no history exists, just stop here
			if (!this.history) Array.from(mediaSources);

			const {
				autorequestDisallowRecentlyPlayedEnabled,
				autorequestDisallowRecentlyPlayedNumber
			} = this.station.requests;

			// If the station is set to disallow recently played songs, and station history is enabled, exclude the last X history songs
			if (
				autorequestDisallowRecentlyPlayedEnabled &&
				experimental.value.station_history
			) {
				this.history.forEach((historyItem, index) => {
					if (index < autorequestDisallowRecentlyPlayedNumber)
						mediaSources.add(historyItem.payload.song.mediaSource);
				});
			}

			return Array.from(mediaSources);
		}
	},
	actions: {
		joinStation(station) {
			this.station = { ...station };
		},
		leaveStation() {
			this.station = {};
			this.autoRequest = [];
			this.autoRequestLock = false;
			this.editing = {};
			this.userCount = 0;
			this.users = {
				loggedIn: [],
				loggedOut: []
			};
			this.currentSong = {};
			this.nextSong = null;
			this.songsList = [];
			this.stationPaused = true;
			this.localPaused = false;
			this.noSong = true;
			this.autofill = [];
			this.blacklist = [];
			this.permissions = {};
		},
		editStation(station) {
			this.editing = { ...station };
		},
		updateStation(station) {
			this.station = { ...this.station, ...station };
		},
		updateUserCount(userCount) {
			this.userCount = userCount;
		},
		updateUsers(users) {
			this.users = users;
		},
		updateCurrentSong(currentSong) {
			this.currentSong = currentSong;
		},
		updateNextSong(nextSong) {
			this.nextSong = nextSong;
		},
		updateSongsList(songsList) {
			this.songsList = songsList;
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
		updateLocalPaused(localPaused) {
			this.localPaused = localPaused;
		},
		updateNoSong(noSong) {
			this.noSong = noSong;
		},
		updateAutoRequest(playlists) {
			this.autoRequest = playlists;
		},
		updateAutoRequestLock(lock) {
			this.autoRequestLock = lock;
		},
		updateIfStationIsFavorited(isFavorited) {
			this.station.isFavorited = isFavorited;
		},
		setAutofillPlaylists(autofillPlaylists) {
			this.autofill = JSON.parse(JSON.stringify(autofillPlaylists));
		},
		setBlacklist(blacklist) {
			this.blacklist = JSON.parse(JSON.stringify(blacklist));
		},
		updateCurrentSongRatings(songRatings) {
			this.currentSong.likes = songRatings.likes;
			this.currentSong.dislikes = songRatings.dislikes;
		},
		updateOwnCurrentSongRatings(ownSongRatings) {
			this.currentSong.liked = ownSongRatings.liked;
			this.currentSong.disliked = ownSongRatings.disliked;
		},
		updateCurrentSongSkipVotes({ skipVotes, skipVotesCurrent, voted }) {
			this.currentSong.skipVotes = skipVotes;
			if (skipVotesCurrent !== null)
				this.currentSong.skipVotesCurrent = skipVotesCurrent;
			this.currentSong.voted = voted;
		},
		addAutorequestPlaylists(playlists) {
			playlists.forEach(playlist => {
				this.autoRequest.push(playlist);
			});
			this.updateAutorequestLocalStorage();
		},
		addPlaylistToAutoRequest(playlist) {
			this.autoRequest.push(playlist);
			this.updateAutorequestLocalStorage();
		},
		removePlaylistFromAutoRequest(playlistId) {
			this.autoRequest.forEach((playlist, index) => {
				if (playlist._id === playlistId) {
					this.autoRequest.splice(index, 1);
				}
			});
			this.updateAutorequestLocalStorage();
		},
		updateAutorequestLocalStorage() {
			const key = `autorequest-${this.station._id}`;
			const playlistIds = Array.from(
				new Set(this.autoRequest.map(playlist => playlist._id))
			);
			const value = {
				updatedAt: new Date(),
				playlistIds
			};
			localStorage.setItem(key, JSON.stringify(value));
		},
		updateMediaModalPlayingAudio(mediaModalPlayingAudio) {
			this.mediaModalPlayingAudio = mediaModalPlayingAudio;
		},
		hasPermission(permission) {
			return !!(this.permissions && this.permissions[permission]);
		},
		updatePermissions() {
			return new Promise(resolve => {
				const { socket } = useWebsocketsStore();
				socket.dispatch(
					"api.getUserModelPermissions",
					{ modelName: "stations", modelId: this.station._id },
					res => {
						this.permissions = res.data;
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
		},
		setHistory(history: StationHistory[]) {
			this.history = history;
		},
		addHistoryItem(historyItem: StationHistory) {
			this.history.unshift(historyItem);
		}
	}
});
