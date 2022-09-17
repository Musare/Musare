import { PlaylistModel, PlaylistSong } from "../models/Playlist";
import { BaseResponse } from "./BaseActions";

export type IndexMyPlaylistsResponse = BaseResponse & {
	data: {
		playlists: (PlaylistModel & { weight: number })[];
	};
};
export type AddSongToPlaylistResponse = BaseResponse & {
	data: {
		songs: PlaylistSong[];
	};
};
export type RemoveSongFromPlaylistResponse = BaseResponse & {
	data: {
		songs: PlaylistSong[];
	};
};
