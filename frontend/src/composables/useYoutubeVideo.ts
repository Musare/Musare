import { ref, reactive } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";

type YoutubeVideo = {
	_id: string;
	youtubeId: string;
	title: string;
	author: string;
	duration: number;
	documentVersion: number;
	createdAt: Date;
	rawData: {
		kind: "youtube#video";
		etag: string;
		id: string;
		snippet: {
			publishedAt: string;
			channelId: string;
			title: string;
			description: string;
			thumbnails: {
				default: {
					url: string;
					width: number;
					height: number;
				};
				medium: {
					url: string;
					width: number;
					height: number;
				};
				high: {
					url: string;
					width: number;
					height: number;
				};
				standard: {
					url: string;
					width: number;
					height: number;
				};
				maxres: {
					url: string;
					width: number;
					height: number;
				};
			};
			channelTitle: string;
			tags: string[];
			categoryId: string;
			liveBroadcastContent: string;
			localized: {
				title: string;
				description: string;
			};
		};
		contentDetails: {
			duration: string;
			dimension: string;
			definition: string;
			caption: string;
			licensedContent: boolean;
			regionRestriction: {
				allowed: string[];
			};
			contentRating: object;
			projection: string;
		};
		status: {
			uploadStatus: string;
			privacyStatus: string;
			license: string;
			embeddable: true;
			publicStatsViewable: true;
			madeForKids: false;
		};
		statistics: {
			viewCount: string;
			likeCount: string;
			favoriteCount: string;
			commentCount: string;
		};
	};
	updatedAt: Date;
	uploadedAt: Date;
};

const youtubeVideoIDRegex = /^([\w-]{11})$/;

export const useYoutubeVideo = () => {
	const youtubeVideoURLOrID = ref("");
	const youtubeVideos = reactive<YoutubeVideo[]>([]);

	const { socket } = useWebsocketsStore();

	const selectYoutubeVideo = () => {
		const youtubeVideoURLOrIDTrimmed = youtubeVideoURLOrID.value.trim();
		if (youtubeVideoURLOrIDTrimmed.length === 0)
			return new Toast(
				"No YouTube video ID found in the supplied value."
			);

		const youtubeVideoIDRegexResult = youtubeVideoIDRegex.exec(
			youtubeVideoURLOrIDTrimmed
		);
		if (!youtubeVideoIDRegexResult)
			return new Toast(
				"No YouTube video ID found in the supplied value."
			);

		return socket.dispatch(
			"youtube.getVideo",
			youtubeVideoIDRegexResult.groups.youtubeVideoID,
			res => {
				if (res.status === "success") {
					const { data } = res;

					if (
						!youtubeVideos.find(
							youtubeVideo =>
								youtubeVideo.youtubeId === data.youtubeId
						)
					)
						youtubeVideos.push(data);

					youtubeVideoURLOrID.value = "";
				} else if (res.status === "error") new Toast(res.message);
			}
		);
	};

	return {
		youtubeVideoURLOrID,
		youtubeVideos,
		selectYoutubeVideo
		// searchForSongs,
		// loadMoreSongs,
		// addYouTubeSongToPlaylist
	};
};
