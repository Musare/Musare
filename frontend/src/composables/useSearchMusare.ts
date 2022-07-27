import { ref, computed } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";

export default function useSearchMusare() {
	const musareSearch = ref({
		query: "",
		searchedQuery: "",
		page: 0,
		count: 0,
		resultsLeft: 0,
		results: [],
		pageSize: 0
	});

	const resultsLeftCount = computed(
		() => musareSearch.value.count - musareSearch.value.results.length
	);

	const nextPageResultsCount = computed(() =>
		Math.min(musareSearch.value.pageSize, resultsLeftCount.value)
	);

	const { socket } = useWebsocketsStore();

	const searchForMusareSongs = (page, toast = true) => {
		if (
			musareSearch.value.page >= page ||
			musareSearch.value.searchedQuery !== musareSearch.value.query
		) {
			musareSearch.value.results = [];
			musareSearch.value.page = 0;
			musareSearch.value.count = 0;
			musareSearch.value.resultsLeft = 0;
			musareSearch.value.pageSize = 0;
		}

		musareSearch.value.searchedQuery = musareSearch.value.query;
		socket.dispatch(
			"songs.searchOfficial",
			musareSearch.value.query,
			page,
			res => {
				if (res.status === "success") {
					const { data } = res;
					const { count, pageSize, songs } = data;

					const newSongs = songs.map(song => ({
						isAddedToQueue: false,
						...song
					}));

					musareSearch.value.results = [
						...musareSearch.value.results,
						...newSongs
					];
					musareSearch.value.page = page;
					musareSearch.value.count = count;
					musareSearch.value.resultsLeft =
						count - musareSearch.value.results.length;
					musareSearch.value.pageSize = pageSize;
				} else if (res.status === "error") {
					musareSearch.value.results = [];
					musareSearch.value.page = 0;
					musareSearch.value.count = 0;
					musareSearch.value.resultsLeft = 0;
					musareSearch.value.pageSize = 0;
					if (toast) new Toast(res.message);
				}
			}
		);
	};

	const addMusareSongToPlaylist = (playlistId, id, index) => {
		socket.dispatch(
			"playlists.addSongToPlaylist",
			false,
			id,
			playlistId,
			res => {
				new Toast(res.message);
				if (res.status === "success")
					musareSearch.value.results[index].isAddedToQueue = true;
			}
		);
	};

	return {
		musareSearch,
		resultsLeftCount,
		nextPageResultsCount,
		searchForMusareSongs,
		addMusareSongToPlaylist
	};
}
