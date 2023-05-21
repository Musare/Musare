export interface StationHistory {
	_id: string;
	stationId: string;
	type: "song_played";
	payload: {
		song: {
			_id: string;
			mediaSource: string;
			title: string;
			artists: string[];
			duration: number;
			thumbnail: string;
			requestedBy: string;
			requestedAt: Date;
			verified: boolean;
		};
		skippedAt: Date;
		skipReason: "natural" | "force_skip" | "vote_skip" | "other";
	};
	documentVersion: number;
}
