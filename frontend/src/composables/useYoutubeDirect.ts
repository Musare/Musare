import { ref } from "vue";
import Toast from "toasters";
import { AddSongToPlaylistResponse } from "@musare_types/actions/PlaylistsActions";
import { useWebsocketsStore } from "@/stores/websockets";

const youtubeVideoIdRegex = /^([\w-]{11})$/;

export const useYoutubeDirect = () => {
	const youtubeDirect = ref("");

	const { socket } = useWebsocketsStore();

	const getYoutubeVideoId = () => {
		try {
			const { searchParams } = new URL(youtubeDirect.value.trim());
			if (searchParams.has("v")) return searchParams.get("v");
		} catch (error) {
			const youtubeVideoIdParts = youtubeVideoIdRegex.exec(
				youtubeDirect.value.trim()
			);
			if (youtubeVideoIdParts) {
				return youtubeVideoIdParts[1];
			}
		}

		return null;
	};

	const addToPlaylist = (playlistId: string) => {
		const youtubeVideoId = getYoutubeVideoId();

		if (!youtubeVideoId)
			new Toast(
				`Could not determine the YouTube video id from the provided URL.`
			);
		else {
			socket.dispatch(
				"playlists.addSongToPlaylist",
				false,
				`youtube:${youtubeVideoId}`,
				playlistId,
				(res: AddSongToPlaylistResponse) => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						new Toast(res.message);
						youtubeDirect.value = "";
					}
				}
			);
		}
	};

	const addToQueue = (stationId: string) => {
		const youtubeVideoId = getYoutubeVideoId();

		if (!youtubeVideoId)
			new Toast(
				`Could not determine the YouTube video id from the provided URL.`
			);
		else {
			socket.dispatch(
				"stations.addToQueue",
				stationId,
				`youtube:${youtubeVideoId}`,
				"manual",
				res => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						new Toast(res.message);
						youtubeDirect.value = "";
					}
				}
			);
		}
	};

	return {
		youtubeDirect,
		addToPlaylist,
		addToQueue,
		getYoutubeVideoId
	};
};
