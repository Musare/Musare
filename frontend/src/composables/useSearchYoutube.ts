import { ref, computed } from "vue";
import { useStore } from "vuex";

import Toast from "toasters";

export function useSearchMusare() {
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

    // const resultsLeftCount = computed(() =>
    //     musareSearch.value.count - musareSearch.value.results.length);

    // const nextPageResultsCount = computed(() =>
    //     Math.min(musareSearch.value.pageSize, resultsLeftCount.value));

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
    }

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
    }

    const addYouTubeSongToPlaylist = (id, index) => {
        socket.dispatch(
            "playlists.addSongToPlaylist",
            false,
            id,
            this.playlist._id,
            res => {
                new Toast(res.message);
                if (res.status === "success")
                    youtubeSearch.value.songs.results[
                        index
                    ].isAddedToQueue = true;
            }
        );
    }

    return { youtubeSearch, searchForSongs, loadMoreSongs, addYouTubeSongToPlaylist };
}