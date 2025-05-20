import { defineStore } from "pinia";
import { ref } from "vue";
import { IndexMyPlaylistsResponse } from "@musare_types/actions/PlaylistsActions";
import { PlaylistModel } from "@musare_types/models/Playlist";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";

export const useUserPlaylistsStore = defineStore("newUserPlaylists", () => {
	const playlists = ref<(PlaylistModel & { weight: number })[]>([]);

	const { userId } = useUserAuthStore();
	const { socket } = useWebsocketsStore();

	socket.onConnect(() => {
		socket.dispatch(
			"playlists.indexMyPlaylists",
			(res: IndexMyPlaylistsResponse) => {
				if (res.status === "success")
					playlists.value = res.data.playlists;
			}
		);
	});

	socket.on("event:playlist.created", res =>
		playlists.value.push(res.data.playlist)
	);

	socket.on("event:playlist.deleted", res => {
		playlists.value.forEach((playlist, index) => {
			if (playlist._id === res.data.playlistId)
				playlists.value.splice(index, 1);
		});
	});

	socket.on("event:playlist.displayName.updated", res => {
		playlists.value.forEach((playlist, index) => {
			if (playlist._id === res.data.playlistId) {
				playlists.value[index].displayName = res.data.displayName;
			}
		});
	});

	socket.on("event:playlist.privacy.updated", res => {
		playlists.value.forEach((playlist, index) => {
			if (playlist._id === res.data.playlist._id) {
				playlists.value[index].privacy = res.data.playlist.privacy;
			}
		});
	});

	socket.on("event:playlist.song.added", res => {
		playlists.value.forEach((playlist, index) => {
			if (playlist._id === res.data.playlistId) {
				playlists.value[index].songs.push(res.data.song);
			}
		});
	});

	socket.on("event:playlist.song.removed", res => {
		playlists.value.forEach((playlist, playlistIndex) => {
			if (playlist._id === res.data.playlistId) {
				playlists.value[playlistIndex].songs.forEach(
					(song, songIndex) => {
						if (song.mediaSource === res.data.mediaSource) {
							playlists.value[playlistIndex].songs.splice(
								songIndex,
								1
							);
						}
					}
				);
			}
		});
	});

	socket.on("event:playlist.song.replaced", res => {
		playlists.value.forEach((playlist, index) => {
			if (playlist._id === res.data.playlistId) {
				playlists.value[index].songs = playlists.value[index].songs.map(
					song =>
						song.mediaSource === res.data.oldMediaSource
							? res.data.song
							: song
				);
			}
		});
	});

	socket.on("event:user.orderOfPlaylists.updated", res => {
		if (res.data.userId !== userId) return;

		const order = res.data.order.filter(playlistId =>
			playlists.value.find(playlist => playlist._id === playlistId)
		);
		const sortedPlaylists = [];

		playlists.value.forEach(playlist => {
			const playlistOrder = order.indexOf(playlist._id);
			if (playlistOrder >= 0) sortedPlaylists[playlistOrder] = playlist;
		});

		playlists.value = sortedPlaylists;
	});

	return {
		playlists
	};
});
