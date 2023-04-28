import { ref } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";

export const useSearchSoundcloud = () => {
	const soundcloudSearch = ref({
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

	const addSoundcloudSongToPlaylist = (playlistId, id, index) => {
		socket.dispatch(
			"playlists.addSongToPlaylist",
			false,
			id,
			playlistId,
			res => {
				new Toast(res.message);
				if (res.status === "success")
					soundcloudSearch.value.songs.results[index].isAddedToQueue =
						true;
			}
		);
	};

	return {
		soundcloudSearch,
		addSoundcloudSongToPlaylist
	};
};
