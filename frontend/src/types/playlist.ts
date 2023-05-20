import { Song } from "./song";

export interface Playlist {
	_id: string;
	displayName: string;
	songs: Song[];
	createdBy: string;
	createdAt: Date;
	createdFor: string;
	privacy: string;
	type: string;
	featured: boolean;
}
