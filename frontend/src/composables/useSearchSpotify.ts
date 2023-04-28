import { ref } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";

export const useSearchSpotify = () => {
	const spotifySearch = ref({
		songs: {
			results: [],
			query: "",
			nextPageToken: ""
		},
		playlist: {
			query: ""
		}
	});

	const { socket } = useWebsocketsStore();

	const addSpotifySongToPlaylist = (playlistId, id, index) => {
		socket.dispatch(
			"playlists.addSongToPlaylist",
			false,
			id,
			playlistId,
			res => {
				new Toast(res.message);
				if (res.status === "success")
					spotifySearch.value.songs.results[index].isAddedToQueue =
						true;
			}
		);
	};

	return {
		spotifySearch,
		addSpotifySongToPlaylist
	};
};
