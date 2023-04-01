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

	// const searchForSongs = () => {
	// let { query } = spotifySearch.value.songs;
	// if (query.indexOf("&index=") !== -1) {
	// 	const splitQuery = query.split("&index=");
	// 	splitQuery.pop();
	// 	query = splitQuery.join("");
	// }
	// if (query.indexOf("&list=") !== -1) {
	// 	const splitQuery = query.split("&list=");
	// 	splitQuery.pop();
	// 	query = splitQuery.join("");
	// }
	// socket.dispatch("apis.searchSpotify", query, res => {
	// 	if (res.status === "success") {
	// 		spotifySearch.value.songs.nextPageToken =
	// 			res.data.nextPageToken;
	// 		spotifySearch.value.songs.results = [];
	// 		res.data.items.forEach(result => {
	// 			spotifySearch.value.songs.results.push({
	// 				id: result.id.videoId,
	// 				url: `https://www.spotify.com/watch?v=${result.id.videoId}`,
	// 				title: result.snippet.title,
	// 				thumbnail: result.snippet.thumbnails.default.url,
	// 				channelId: result.snippet.channelId,
	// 				channelTitle: result.snippet.channelTitle,
	// 				isAddedToQueue: false
	// 			});
	// 		});
	// 	} else if (res.status === "error") new Toast(res.message);
	// });
	// };

	// const loadMoreSongs = () => {
	// socket.dispatch(
	// 	"apis.searchSpotifyForPage",
	// 	spotifySearch.value.songs.query,
	// 	spotifySearch.value.songs.nextPageToken,
	// 	res => {
	// 		if (res.status === "success") {
	// 			spotifySearch.value.songs.nextPageToken =
	// 				res.data.nextPageToken;
	// 			res.data.items.forEach(result => {
	// 				spotifySearch.value.songs.results.push({
	// 					id: result.id.videoId,
	// 					url: `https://www.spotify.com/watch?v=${result.id.videoId}`,
	// 					title: result.snippet.title,
	// 					thumbnail: result.snippet.thumbnails.default.url,
	// 					channelId: result.snippet.channelId,
	// 					channelTitle: result.snippet.channelTitle,
	// 					isAddedToQueue: false
	// 				});
	// 			});
	// 		} else if (res.status === "error") new Toast(res.message);
	// 	}
	// );
	// };

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
		// searchForSongs,
		// loadMoreSongs,
		addSpotifySongToPlaylist
	};
};
