import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useStore } from "vuex";
import { Sortable } from "sortablejs-vue3";
import Toast from "toasters";
import ws from "@/ws";

export function useSortablePlaylists() {
    const orderOfPlaylists = ref([]);
    const drag = ref(false);
    const userId = ref();
    const currentUser = ref(true);

    const store = useStore();

    const playlists = computed({
        get: () => {
            return store.state.user.playlists.playlists;
        },
        set: (playlists) => {
            store.commit("user/playlists/updatePlaylists", playlists);
        }
    });
    const dragOptions = computed(() => ({
        animation: 200,
        group: "playlists",
        disabled: !currentUser.value,
        ghostClass: "draggable-list-ghost"
    }));

    const { socket } = store.state.websockets;

    const setPlaylists = playlists => store.dispatch("user/playlists/setPlaylists", playlists);
    const addPlaylist = playlist => store.dispatch("user/playlists/addPlaylist", playlist);
    const removePlaylist = playlist => store.dispatch("user/playlists/removePlaylist", playlist);

    const calculatePlaylistOrder = () => {
        const calculatedOrder = [];
        playlists.value.forEach(playlist =>
            calculatedOrder.push(playlist._id)
        );

        return calculatedOrder;
    };

    const savePlaylistOrder = ({ oldIndex, newIndex }) => {
        if (oldIndex === newIndex) return;
		const oldPlaylists = playlists.value;

		oldPlaylists.splice(
			newIndex,
			0,
			oldPlaylists.splice(oldIndex, 1)[0]
		);

		setPlaylists(oldPlaylists).then(() => {
			const recalculatedOrder = calculatePlaylistOrder();

			socket.dispatch(
				"users.updateOrderOfPlaylists",
				recalculatedOrder,
				res => {
					if (res.status === "error") return new Toast(res.message);

					orderOfPlaylists.value = calculatePlaylistOrder(); // new order in regards to the database
					return new Toast(res.message);
				}
			);
		});
    };

    onMounted(async () => {
		await nextTick();
		ws.onConnect(() => {
			if (!currentUser.value)
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
				const sortedPlaylists = [];

				playlists.value.forEach(playlist => {
					sortedPlaylists[res.data.order.indexOf(playlist._id)] =
						playlist;
				});

				playlists.value = sortedPlaylists;
				orderOfPlaylists.value = calculatePlaylistOrder();
			},
			{ replaceable: true }
		);
	});

	onBeforeUnmount(() => {
		if (!currentUser.value)
			socket.dispatch(
				"apis.leaveRoom",
				`profile.${userId.value}.playlists`,
				() => {}
			);
	});

    return {
		Sortable,
        drag,
        userId,
        currentUser,
        playlists,
        dragOptions,
        savePlaylistOrder
    };
};
