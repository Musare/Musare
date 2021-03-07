<script>
import Toast from "toasters";

export default {
	data() {
		return {
			search: {
				songs: {
					results: [],
					query: "",
					nextPageToken: ""
				},
				playlist: {
					query: "",
					isImportingOnlyMusic: true
				}
			}
		};
	},
	methods: {
		searchForSongs() {
			let { query } = this.search.songs;

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

			this.socket.dispatch("apis.searchYoutube", query, res => {
				if (res.status === "success") {
					this.search.songs.nextPageToken = res.data.nextPageToken;
					this.search.songs.results = [];

					res.data.items.forEach(result => {
						this.search.songs.results.push({
							id: result.id.videoId,
							url: `https://www.youtube.com/watch?v=${this.id}`,
							title: result.snippet.title,
							thumbnail: result.snippet.thumbnails.default.url,
							isAddedToQueue: false
						});
					});
				} else if (res.status === "error")
					new Toast({ content: res.message, timeout: 3000 });
			});
		},
		loadMoreSongs() {
			this.socket.dispatch(
				"apis.searchYoutubeForPage",
				this.search.songs.query,
				this.search.songs.nextPageToken,
				res => {
					if (res.status === "success") {
						this.search.songs.nextPageToken =
							res.data.nextPageToken;

						res.data.items.forEach(result => {
							this.search.songs.results.push({
								id: result.id.videoId,
								url: `https://www.youtube.com/watch?v=${this.id}`,
								title: result.snippet.title,
								thumbnail:
									result.snippet.thumbnails.default.url,
								isAddedToQueue: false
							});
						});
					} else if (res.status === "error")
						new Toast({ content: res.message, timeout: 3000 });
				}
			);
		}
	}
};
</script>
