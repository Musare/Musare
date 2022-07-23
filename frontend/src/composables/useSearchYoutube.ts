import { ref } from "vue";
import { useStore } from "vuex";

import Toast from "toasters";

export default function useSearchYoutube() {
	const store = useStore();

	const youtubeSearch = ref({
		songs: {
			results: [],
			query: "",
			nextPageToken: ""
		},
		playlist: {
			query: "",
			isImportingOnlyMusic: true
		}
	});

	const { socket } = store.state.websockets;

	const searchForSongs = () => {
		let { query } = youtubeSearch.value.songs;

		if (query.indexOf("&index=") !== -1) {
			query = query.split("&index=");
			query.pop();
			query = query.join("");
		}

		if (query.indexOf("&list=") !== -1) {
			query = query.split("&list=");
			query.pop();
			query = query.join("");
		}

		socket.dispatch("apis.searchYoutube", query, res => {
			if (res.status === "success") {
				youtubeSearch.value.songs.nextPageToken =
					res.data.nextPageToken;
				youtubeSearch.value.songs.results = [];

				res.data.items.forEach(result => {
					youtubeSearch.value.songs.results.push({
						id: result.id.videoId,
						url: `https://www.youtube.com/watch?v=${result.id.videoId}`,
						title: result.snippet.title,
						thumbnail: result.snippet.thumbnails.default.url,
						channelId: result.snippet.channelId,
						channelTitle: result.snippet.channelTitle,
						isAddedToQueue: false
					});
				});
			} else if (res.status === "error") new Toast(res.message);
		});
	};

	const loadMoreSongs = () => {
		socket.dispatch(
			"apis.searchYoutubeForPage",
			youtubeSearch.value.songs.query,
			youtubeSearch.value.songs.nextPageToken,
			res => {
				if (res.status === "success") {
					youtubeSearch.value.songs.nextPageToken =
						res.data.nextPageToken;

					res.data.items.forEach(result => {
						youtubeSearch.value.songs.results.push({
							id: result.id.videoId,
							url: `https://www.youtube.com/watch?v=${result.id.videoId}`,
							title: result.snippet.title,
							thumbnail: result.snippet.thumbnails.default.url,
							channelId: result.snippet.channelId,
							channelTitle: result.snippet.channelTitle,
							isAddedToQueue: false
						});
					});
				} else if (res.status === "error") new Toast(res.message);
			}
		);
	};

	const addYouTubeSongToPlaylist = (playlistId, id, index) => {
		socket.dispatch(
			"playlists.addSongToPlaylist",
			false,
			id,
			playlistId,
			res => {
				new Toast(res.message);
				if (res.status === "success")
					youtubeSearch.value.songs.results[index].isAddedToQueue =
						true;
			}
		);
	};

	return {
		youtubeSearch,
		searchForSongs,
		loadMoreSongs,
		addYouTubeSongToPlaylist
	};
}
