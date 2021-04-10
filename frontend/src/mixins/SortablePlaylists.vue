<script>
import { mapState } from "vuex";
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
			station: state => state.station.station
		}),
		dragOptions() {
			return {
				animation: 200,
				group: "description",
				disabled: this.myUserId !== this.userId,
				ghostClass: "draggable-list-ghost"
			};
		}
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
					if (res.status === "failure") return new Toast(res.message);

					this.orderOfPlaylists = this.calculatePlaylistOrder(); // new order in regards to the database
					return new Toast(res.message);
				}
			);
		}
	}
};
</script>
