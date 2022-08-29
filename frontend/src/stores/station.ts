import { defineStore } from "pinia";
import { Playlist } from "@/types/playlist";
import { Song, CurrentSong } from "@/types/song";
import { Station } from "@/types/station";
import { User } from "@/types/user";
import ws from "@/ws";

export const useStationStore = defineStore("station", {
	state: () => ({
		station: <Station>{},
		autoRequest: <Playlist[]>[],
		autoRequestLock: false,
		editing: {},
		userCount: 0,
		users: {
			loggedIn: <User[]>[],
			loggedOut: <User[]>[]
		},
		currentSong: <CurrentSong | undefined>{},
		nextSong: <Song | undefined | null>null,
		songsList: <Song[]>[],
		stationPaused: true,
		localPaused: false,
		noSong: true,
		autofill: <Playlist[]>[],
		blacklist: <Playlist[]>[],
		mediaModalPlayingAudio: false,
		permissions: {}
	}),
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
		updateCurrentSongSkipVotes({ skipVotes, skipVotesCurrent }) {
			this.currentSong.skipVotes = skipVotes;
			if (skipVotesCurrent !== null)
				this.currentSong.skipVotesCurrent = skipVotesCurrent;
		},
		addPlaylistToAutoRequest(playlist) {
			this.autoRequest.push(playlist);
		},
		removePlaylistFromAutoRequest(playlistId) {
			this.autoRequest.forEach((playlist, index) => {
				if (playlist._id === playlistId) {
					this.autoRequest.splice(index, 1);
				}
			});
		},
		updateMediaModalPlayingAudio(mediaModalPlayingAudio) {
			this.mediaModalPlayingAudio = mediaModalPlayingAudio;
		},
		hasPermission(permission) {
			return !!(this.permissions && this.permissions[permission]);
		},
		updatePermissions() {
			return new Promise(resolve => {
				ws.socket.dispatch(
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
});
