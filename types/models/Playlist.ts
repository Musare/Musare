// TODO check if all of these properties are always present
export type PlaylistSong = {
	_id: string;
	mediaSource: string;
	title: string;
	artists: string[];
	duration: number;
	skipDuration: number;
	thumbnail: string;
	verified: boolean;
};

export type PlaylistModel = {
	_id: string;
	displayName: string;
	songs: PlaylistSong[];
	createdBy: string;
	// TODO check if it's a date or a string, might be wrong
	createdAt: Date;
	createdFor: string | null;
	privacy: "public" | "private";
	type: "user" | "user-liked" | "user-disliked" | "genre" | "station";
	documentVersion: number;
};
