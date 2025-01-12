export interface User {
	_id: string;
	username: string;
	role: string;
	email: {
		verified: boolean;
		verificationToken?: string;
		address: string;
	};
	avatar: {
		type: string;
		url?: string;
		color?: string;
	};
	services: {
		password?: {
			password: string;
			reset: {
				code: string;
				expires: Date;
			};
			set: {
				code: string;
				expires: Date;
			};
		};
		oidc?: {
			sub: string;
			access_token: string;
		};
	};
	password?: boolean;
	oidc?: boolean;
	statistics: {
		songsRequested: number;
	};
	likedSongsPlaylist: string;
	dislikedSongsPlaylist: string;
	favoriteStations: string[];
	name: string;
	location: string;
	bio: string;
	createdAt: Date;
	preferences: {
		orderOfPlaylists: string[];
		nightmode: boolean;
		autoSkipDisliked: boolean;
		activityLogPublic: boolean;
		anonymousSongRequests: boolean;
		activityWatch: boolean;
	};
}
