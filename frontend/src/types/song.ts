export interface Song {
	_id: string;
	youtubeId: string;
	title: string;
	artists: string[];
	genres: string[];
	tags: string[];
	duration: number;
	skipDuration: number;
	thumbnail: string;
	explicit: boolean;
	requestedBy: string;
	requestedAt: Date;
	verified: boolean;
	verifiedBy: string;
	verifiedAt: Date;
	discogs?: {
		album?: {
			albumArt: string;
			title: string;
			type: string;
			year: string;
			artists: string[];
			genres: string[];
		};
		dataQuality?: string;
		track?: {
			position: string;
			title: string;
		};
	};
	position?: number;
}

export interface CurrentSong extends Song {
	skipVotes: number;
	skipVotesCurrent: number;
	likes: number;
	dislikes: number;
	liked: boolean;
	disliked: boolean;
}
