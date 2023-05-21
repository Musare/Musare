import { Song } from "./song";
import { Playlist } from "./playlist";
import { User } from "./user";

export interface Station {
	_id: string;
	name: string;
	type: string;
	displayName: string;
	description: string;
	paused: boolean;
	currentSong?: Song;
	currentSongIndex?: number;
	timePaused: number;
	pausedAt: number;
	startedAt: number;
	playlist: Playlist;
	privacy: string;
	queue: Song[];
	owner: string;
	requests: {
		enabled: boolean;
		access: string;
		limit: number;
		allowAutorequest: boolean;
		autorequestLimit: number;
		autorequestDisallowRecentlyPlayedEnabled: boolean;
		autorequestDisallowRecentlyPlayedNumber: number;
	};
	autofill: {
		enabled: boolean;
		playlists: Playlist[];
		limit: number;
		mode: string;
	};
	theme: string;
	blacklist: Playlist[];
	djs: User[];
	skipVoteThreshold: number;
}
