<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";
import draggable from "vuedraggable";

export default {
	components: { draggable },
	data() {
		return {
			orderOfPlaylists: [],
			drag: false
		};
	},
	computed: {
		...mapState({
			station: state => state.station.station,
			myUserId: state => state.user.auth.userId,
			playlists: state => state.user.playlists.playlists
		}),
		dragOptions() {
			return {
				animation: 200,
				group: "playlists",
				disabled: this.myUserId !== this.userId,
				ghostClass: "draggable-list-ghost"
			};
		}
	},
	mounted() {
		this.socket.on(
			"event:playlist.created",
			res => this.addPlaylist(res.data.playlist),
			{ replaceable: true }
		);

		this.socket.on(
			"event:playlist.deleted",
			res => this.removePlaylist(res.data.playlistId),
			{ replaceable: true }
		);

		this.socket.on(
			"event:playlist.song.added",
			res => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === res.data.playlistId) {
						this.playlists[index].songs.push(res.data.song);
					}
				});
			},
			{ replaceable: true }
		);

		this.socket.on(
			"event:playlist.song.removed",
			res => {
				this.playlists.forEach((playlist, playlistIndex) => {
					if (playlist._id === res.data.playlistId) {
						this.playlists[playlistIndex].songs.forEach(
							(song, songIndex) => {
								if (song.youtubeId === res.data.youtubeId) {
									this.playlists[playlistIndex].songs.splice(
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

		this.socket.on(
			"event:playlist.displayName.updated",
			res => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === res.data.playlistId) {
						this.playlists[index].displayName =
							res.data.displayName;
					}
				});
			},
			{ replaceable: true }
		);

		this.socket.on(
			"event:playlist.privacy.updated",
			res => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === res.data.playlist._id) {
						this.playlists[index].privacy =
							res.data.playlist.privacy;
					}
				});
			},
			{ replaceable: true }
		);

		this.socket.on(
			"event:user.orderOfPlaylists.updated",
			res => {
				const sortedPlaylists = [];

				this.playlists.forEach(playlist => {
					sortedPlaylists[
						res.data.order.indexOf(playlist._id)
					] = playlist;
				});

				this.playlists = sortedPlaylists;
				this.orderOfPlaylists = this.calculatePlaylistOrder();
			},
			{ replaceable: true }
		);
	},
	methods: {
		calculatePlaylistOrder() {
			const calculatedOrder = [];
			this.playlists.forEach(playlist =>
				calculatedOrder.push(playlist._id)
			);

			return calculatedOrder;
		},
		savePlaylistOrder() {
			const recalculatedOrder = this.calculatePlaylistOrder();
			if (
				JSON.stringify(this.orderOfPlaylists) ===
				JSON.stringify(recalculatedOrder)
			)
				return; // nothing has changed

			this.socket.dispatch(
				"users.updateOrderOfPlaylists",
				recalculatedOrder,
				res => {
					if (res.status === "error") return new Toast(res.message);

					this.orderOfPlaylists = this.calculatePlaylistOrder(); // new order in regards to the database
					return new Toast(res.message);
				}
			);
		},
		...mapActions("user/playlists", ["addPlaylist", "removePlaylist"])
	}
};
</script>
