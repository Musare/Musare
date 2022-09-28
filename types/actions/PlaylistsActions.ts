import { PlaylistModel, PlaylistSong } from "../models/Playlist";
import { GenericResponse } from "./GenericActions";

export type IndexMyPlaylistsResponse = GenericResponse & {
	data: {
		playlists: (PlaylistModel & { weight: number })[];
	};
};
export type AddSongToPlaylistResponse = GenericResponse & {
	data: {
		songs: PlaylistSong[];
	};
};
export type RemoveSongFromPlaylistResponse = GenericResponse & {
	data: {
		songs: PlaylistSong[];
	};
};
