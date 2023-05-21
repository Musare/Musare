import { ref } from "vue";
import Toast from "toasters";
import { AddSongToPlaylistResponse } from "@musare_types/actions/PlaylistsActions";
import { useWebsocketsStore } from "@/stores/websockets";

export const useSoundcloudDirect = () => {
	const soundcloudDirect = ref("");

	const { socket } = useWebsocketsStore();

	const addToPlaylist = (playlistId: string) => {
		const url = soundcloudDirect.value.trim();

		socket.dispatch(
			"playlists.addSongToPlaylist",
			false,
			url,
			playlistId,
			(res: AddSongToPlaylistResponse) => {
				if (res.status !== "success")
					new Toast(`Error: ${res.message}`);
				else {
					new Toast(res.message);
					soundcloudDirect.value = "";
				}
			}
		);
	};

	const addToQueue = (stationId: string) => {
		const url = soundcloudDirect.value.trim();

		socket.dispatch(
			"stations.addToQueue",
			stationId,
			url,
			"manual",
			res => {
				if (res.status !== "success")
					new Toast(`Error: ${res.message}`);
				else {
					new Toast(res.message);
					soundcloudDirect.value = "";
				}
			}
		);
	};

	return {
		soundcloudDirect,
		addToPlaylist,
		addToQueue
	};
};
