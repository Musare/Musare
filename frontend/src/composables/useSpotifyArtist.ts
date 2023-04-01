import { ref } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";

// type SpotifyArtist = {
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

const spotifyArtistIDRegex = /(?<artistId>[A-Za-z0-9]{22})/;
const spotifyArtistURLRegex =
	/open\.spotify\.com\/artist\/(?<artistId>[A-Za-z0-9]{22})/;

export const useSpotifyArtist = () => {
	const spotifyArtistURLOrID = ref("");

	const { socket } = useWebsocketsStore();

	const getSpotifyArtist = async () => {
		const spotifyArtistURLOrIDTrimmed = spotifyArtistURLOrID.value.trim();
		if (spotifyArtistURLOrIDTrimmed.length === 0)
			return new Toast(
				"No Spotify artist ID found in the supplied value."
			);

		const spotifyArtistIDRegexResult = spotifyArtistIDRegex.exec(
			spotifyArtistURLOrIDTrimmed
		);
		const spotifyArtistURLRegexResult = spotifyArtistURLRegex.exec(
			spotifyArtistURLOrIDTrimmed
		);

		if (!spotifyArtistIDRegexResult && !spotifyArtistURLRegexResult)
			return new Toast(
				"No Spotify artist ID found in the supplied value."
			);

		const artistId = spotifyArtistIDRegexResult
			? spotifyArtistIDRegexResult.groups.artistId
			: spotifyArtistURLRegexResult.groups.artistId;

		return new Promise((resolve, reject) => {
			socket.dispatch("spotify.getArtistsFromIds", [artistId], res => {
				if (res.status === "success") {
					const { data } = res;
					const artist = data.artists[0];

					resolve(artist);
				} else if (res.status === "error") {
					new Toast(res.message);
					reject();
				}
			});
		});
	};

	return {
		spotifyArtistURLOrID,
		getSpotifyArtist
	};
};
