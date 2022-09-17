export type NewsModel = {
	title: string;
	markdown: string;
	status: "draft" | "published" | "archived";
	showToNewUsers: boolean;
	createdBy: string;
	createdAt: number;
	documentVersion: number;
};
