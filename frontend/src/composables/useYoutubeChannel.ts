import { ref } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";

// type YoutubeChannel = {
// 	_id: string;
// 	channelId: string;
// 	title: string;
// 	customUrl?: string;
// 	rawData: {
// 		kind: string;
// 		etag: string;
// 		id: string;
// 		snippet: {
// 			title: string;
// 			description: string;
// 			customUrl?: string;
// 			publishedAt: string;
// 			thumbnails: {
// 				default: {
// 					url: string;
// 					width: number;
// 					height: number;
// 				};
// 				medium: {
// 					url: string;
// 					width: number;
// 					height: number;
// 				};
// 				high: {
// 					url: string;
// 					width: number;
// 					height: number;
// 				};
// 			};
// 			defaultLanguage?: string;
// 			localized: {
// 				title: string;
// 				description: string;
// 			};
// 		};
// 		contentDetails: {
// 			relatedPlaylists: {
// 				likes: string;
// 				uploads: string;
// 			};
// 		};
// 		statistics: {
// 			viewCount: string;
// 			subscriberCount: string;
// 			hiddenSubscriberCount: boolean;
// 			videoCount: string;
// 		};
// 		topicDetails: {
// 			topicIds: string[];
// 			topicCategories: string[];
// 		};
// 		status: {
// 			privacyStatus: string;
// 			isLinked: boolean;
// 			longUploadsStatus: string;
// 			madeForKids?: boolean;
// 		};
// 		brandingSettings: {
// 			channel: {
// 				title: string;
// 				keywords?: string;
// 				description?: string;
// 				unsubscribedTrailer?: string;
// 				defaultLanguage?: string;
// 			};
// 			image?: {
// 				bannerExternalUrl: string;
// 			};
// 		};
// 	};
// 	documentVersion: number;
// 	createdAt: Date;
// 	updatedAt: Date;
// };

const youtubeChannelIDRegex = /(?<youtubeChannelID>UC[A-Za-z0-9-_]+)/;

export const useYoutubeChannel = () => {
	const youtubeChannelURLOrID = ref("");

	const { socket } = useWebsocketsStore();

	const getYoutubeChannel = async () => {
		const youtubeChannelURLOrIDTrimmed = youtubeChannelURLOrID.value.trim();
		if (youtubeChannelURLOrIDTrimmed.length === 0)
			return new Toast(
				"No YouTube channel ID found in the supplied value."
			);

		const youtubeChannelIDRegexResult = youtubeChannelIDRegex.exec(
			youtubeChannelURLOrIDTrimmed
		);
		if (!youtubeChannelIDRegexResult)
			return new Toast(
				"No YouTube channel ID found in the supplied value."
			);

		return new Promise((resolve, reject) => {
			socket.dispatch(
				"youtube.getChannel",
				youtubeChannelIDRegexResult.groups.youtubeChannelID,
				res => {
					if (res.status === "success") {
						const { data } = res;

						resolve(data);

						youtubeChannelURLOrID.value = "";
					} else if (res.status === "error") {
						new Toast(res.message);
						reject();
					}
				}
			);
		});
	};

	const getYoutubeChannelVideos = async channelId =>
		new Promise((resolve, reject) => {
			socket.dispatch("youtube.getChannelVideos", channelId, res => {
				if (res.status === "success") {
					const { data } = res;

					resolve(data);
				} else if (res.status === "error") {
					new Toast(res.message);
					reject();
				}
			});
		});

	return {
		youtubeChannelURLOrID,
		getYoutubeChannel,
		getYoutubeChannelVideos
	};
};
