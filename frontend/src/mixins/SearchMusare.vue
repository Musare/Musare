<script>
import Toast from "toasters";

export default {
	data() {
		return {
			musareSearch: {
				query: "",
				searchedQuery: "",
				page: 0,
				count: 0,
				resultsLeft: 0,
				results: []
			}
		};
	},
	computed: {
		resultsLeftCount() {
			return this.musareSearch.count - this.musareSearch.results.length;
		},
		nextPageResultsCount() {
			return Math.min(this.musareSearch.pageSize, this.resultsLeftCount);
		}
	},
	methods: {
		searchForMusareSongs(page) {
			if (
				this.musareSearch.page >= page ||
				this.musareSearch.searchedQuery !== this.musareSearch.query
			) {
				this.musareSearch.results = [];
				this.musareSearch.page = 0;
				this.musareSearch.count = 0;
				this.musareSearch.resultsLeft = 0;
				this.musareSearch.pageSize = 0;
			}

			this.musareSearch.searchedQuery = this.musareSearch.query;
			this.socket.dispatch(
				"songs.searchOfficial",
				this.musareSearch.query,
				page,
				res => {
					const { data } = res;
					const { count, pageSize, songs } = data;

					const newSongs = songs.map(song => ({
						isAddedToQueue: false,
						...song
					}));

					if (res.status === "success") {
						this.musareSearch.results = [
							...this.musareSearch.results,
							...newSongs
						];
						this.musareSearch.page = page;
						this.musareSearch.count = count;
						this.musareSearch.resultsLeft =
							count - this.musareSearch.results.length;
						this.musareSearch.pageSize = pageSize;
					} else if (res.status === "error") {
						this.musareSearch.results = [];
						this.musareSearch.page = 0;
						this.musareSearch.count = 0;
						this.musareSearch.resultsLeft = 0;
						this.musareSearch.pageSize = 0;
						new Toast(res.message);
					}
				}
			);
		},
		addMusareSongToPlaylist(id, index) {
			this.socket.dispatch(
				"playlists.addSongToPlaylist",
				false,
				id,
				this.playlist._id,
				res => {
					new Toast(res.message);
					if (res.status === "success")
						this.musareSearch.results[index].isAddedToQueue = true;
				}
			);
		}
	}
};
</script>
