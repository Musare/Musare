<script>
import Toast from "toasters";

export default {
	data() {
		return {
			youtubeSearch: {
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
			let { query } = this.youtubeSearch.songs;

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
					this.youtubeSearch.songs.nextPageToken =
						res.data.nextPageToken;
					this.youtubeSearch.songs.results = [];

					res.data.items.forEach(result => {
						this.youtubeSearch.songs.results.push({
							id: result.id.videoId,
							url: `https://www.youtube.com/watch?v=${this.id}`,
							title: result.snippet.title,
							thumbnail: result.snippet.thumbnails.default.url,
							channelId: result.snippet.channelId,
							channelTitle: result.snippet.channelTitle,
							isAddedToQueue: false
						});
					});
				} else if (res.status === "error") new Toast(res.message);
			});
		},
		loadMoreSongs() {
			this.socket.dispatch(
				"apis.searchYoutubeForPage",
				this.youtubeSearch.songs.query,
				this.youtubeSearch.songs.nextPageToken,
				res => {
					if (res.status === "success") {
						this.youtubeSearch.songs.nextPageToken =
							res.data.nextPageToken;

						res.data.items.forEach(result => {
							this.youtubeSearch.songs.results.push({
								id: result.id.videoId,
								url: `https://www.youtube.com/watch?v=${this.id}`,
								title: result.snippet.title,
								thumbnail:
									result.snippet.thumbnails.default.url,
								channelId: result.snippet.channelId,
								channelTitle: result.snippet.channelTitle,
								isAddedToQueue: false
							});
						});
					} else if (res.status === "error") new Toast(res.message);
				}
			);
		},
		addSongToPlaylist(id, index) {
			this.socket.dispatch(
				"playlists.addSongToPlaylist",
				false,
				id,
				this.playlist._id,
				res => {
					new Toast(res.message);
					if (res.status === "success")
						this.youtubeSearch.songs.results[
							index
						].isAddedToQueue = true;
				}
			);
		}
	}
};
</script>
