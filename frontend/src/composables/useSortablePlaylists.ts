import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import { useUserPlaylistsStore } from "@/stores/userPlaylists";
import ws from "@/ws";
import Draggable from "@/components/Draggable.vue";

export const useSortablePlaylists = () => {
	const orderOfPlaylists = ref([]);
	const drag = ref(false);
	const userId = ref();

	const userAuthStore = useUserAuthStore();
	const userPlaylistsStore = useUserPlaylistsStore();

	const { userId: myUserId } = storeToRefs(userAuthStore);

	const playlists = computed({
		get: () => userPlaylistsStore.playlists,
		set: playlists => {
			userPlaylistsStore.updatePlaylists(playlists);
		}
	});
	const isCurrentUser = computed(() => userId.value === myUserId.value);
	const dragOptions = computed(() => ({
		animation: 200,
		group: "playlists",
		disabled: !isCurrentUser.value,
		ghostClass: "draggable-list-ghost"
	}));

	const { socket } = useWebsocketsStore();

	const { setPlaylists, addPlaylist, removePlaylist } = userPlaylistsStore;

	const calculatePlaylistOrder = () => {
		const calculatedOrder = [];
		playlists.value.forEach(playlist => calculatedOrder.push(playlist._id));

		return calculatedOrder;
	};

	const savePlaylistOrder = () => {
		const recalculatedOrder = calculatePlaylistOrder();
		if (
			JSON.stringify(orderOfPlaylists.value) ===
			JSON.stringify(recalculatedOrder)
		)
			return; // nothing has changed

		socket.dispatch(
			"users.updateOrderOfPlaylists",
			recalculatedOrder,
			res => {
				if (res.status === "error") return new Toast(res.message);

				orderOfPlaylists.value = calculatePlaylistOrder(); // new order in regards to the database
				return new Toast(res.message);
			}
		);
	};

	onMounted(async () => {
		await nextTick();

		if (!userId.value) userId.value = myUserId.value;

		ws.onConnect(() => {
			if (!isCurrentUser.value)
				socket.dispatch(
					"apis.joinRoom",
					`profile.${userId.value}.playlists`,
					() => {}
				);

			socket.dispatch("playlists.indexForUser", userId.value, res => {
				if (res.status === "success") setPlaylists(res.data.playlists);
				orderOfPlaylists.value = calculatePlaylistOrder(); // order in regards to the database
			});
		});

		socket.on(
			"event:playlist.created",
			res => addPlaylist(res.data.playlist),
			{ replaceable: true }
		);

		socket.on(
			"event:playlist.deleted",
			res => removePlaylist(res.data.playlistId),
			{ replaceable: true }
		);

		socket.on(
			"event:playlist.song.added",
			res => {
				playlists.value.forEach((playlist, index) => {
					if (playlist._id === res.data.playlistId) {
						playlists.value[index].songs.push(res.data.song);
					}
				});
			},
			{ replaceable: true }
		);

		socket.on(
			"event:playlist.song.removed",
			res => {
				playlists.value.forEach((playlist, playlistIndex) => {
					if (playlist._id === res.data.playlistId) {
						playlists.value[playlistIndex].songs.forEach(
							(song, songIndex) => {
								if (song.youtubeId === res.data.youtubeId) {
									playlists.value[playlistIndex].songs.splice(
										songIndex,
										1
									);
								}
							}
						);
					}
				});
			},
			{ replaceable: true }
		);

		socket.on(
			"event:playlist.displayName.updated",
			res => {
				playlists.value.forEach((playlist, index) => {
					if (playlist._id === res.data.playlistId) {
						playlists.value[index].displayName =
							res.data.displayName;
					}
				});
			},
			{ replaceable: true }
		);

		socket.on(
			"event:playlist.privacy.updated",
			res => {
				playlists.value.forEach((playlist, index) => {
					if (playlist._id === res.data.playlist._id) {
						playlists.value[index].privacy =
							res.data.playlist.privacy;
					}
				});
			},
			{ replaceable: true }
		);

		socket.on(
			"event:user.orderOfPlaylists.updated",
			res => {
				const order = res.data.order.filter(playlistId =>
					playlists.value.find(
						playlist =>
							playlist._id === playlistId &&
							(isCurrentUser.value ||
								playlist.privacy === "public")
					)
				);
				const sortedPlaylists = [];

				playlists.value.forEach(playlist => {
					const playlistOrder = order.indexOf(playlist._id);
					if (playlistOrder >= 0)
						sortedPlaylists[playlistOrder] = playlist;
				});

				playlists.value = sortedPlaylists;
				orderOfPlaylists.value = calculatePlaylistOrder();
			},
			{ replaceable: true }
		);
	});

	onBeforeUnmount(() => {
		if (!isCurrentUser.value)
			socket.dispatch(
				"apis.leaveRoom",
				`profile.${userId.value}.playlists`,
				() => {}
			);
	});

	return {
		Draggable,
		drag,
		userId,
		isCurrentUser,
		playlists,
		dragOptions,
		orderOfPlaylists,
		myUserId,
		savePlaylistOrder,
		calculatePlaylistOrder
	};
};
