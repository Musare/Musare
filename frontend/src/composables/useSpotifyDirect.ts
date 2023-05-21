import { ref } from "vue";
import Toast from "toasters";
import { AddSongToPlaylistResponse } from "@musare_types/actions/PlaylistsActions";
import { useWebsocketsStore } from "@/stores/websockets";

const spotifyTrackUrlRegex =
	/.+open\.spotify\.com\/track\/(?<trackId>[A-Za-z0-9]+)/;

export const useSpotifyDirect = () => {
	const spotifyDirect = ref("");

	const { socket } = useWebsocketsStore();

	const getSpotifyTrackId = () => {
		const match = spotifyTrackUrlRegex.exec(spotifyDirect.value.trim());
		if (!match || !match.groups) return null;

		const { trackId } = match.groups;

		return trackId;
	};

	const addToPlaylist = (playlistId: string) => {
		const spotifyTrackId = getSpotifyTrackId();

		if (!spotifyTrackId)
			new Toast(
				`Could not determine the Spotify track id from the provided URL.`
			);
		else {
			socket.dispatch(
				"playlists.addSongToPlaylist",
				false,
				`spotify:${spotifyTrackId}`,
				playlistId,
				(res: AddSongToPlaylistResponse) => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						new Toast(res.message);
						spotifyDirect.value = "";
					}
				}
			);
		}
	};

	return {
		spotifyDirect,
		addToPlaylist
	};
};
