import { Song } from "./song";
import { User } from "./user";

export interface Report {
	_id: string;
	resolved: boolean;
	song: Song;
	issues: [
		{
			_id: string;
			category: string;
			title: string;
			description: string;
			resolved: boolean;
		}
	];
	createdBy: User;
	createdAt: Date;
}
