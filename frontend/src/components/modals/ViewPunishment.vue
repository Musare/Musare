<template>
	<div>
		<modal title="View Punishment">
			<template #body v-if="punishment && punishment._id">
				<punishment-item :punishment="punishment" />
			</template>
		</modal>
	</div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import { format, formatDistance, parseISO } from "date-fns";
import ws from "@/ws";

import Toast from "toasters";
import Modal from "../Modal.vue";
import PunishmentItem from "../PunishmentItem.vue";

export default {
	components: { Modal, PunishmentItem },
	props: {
		punishmentId: { type: String, default: "" },
		sector: { type: String, default: "admin" }
	},
	data() {
		return {
			ban: {}
		};
	},
	computed: {
		...mapState("modals/viewPunishment", {
			punishment: state => state.punishment
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);
	},
	methods: {
		init() {
			this.socket.dispatch(
				`punishments.findOne`,
				this.punishmentId,
				res => {
					if (res.status === "success") {
						const { punishment } = res.data;
						this.viewPunishment(punishment);
					} else {
						new Toast("Punishment with that ID not found");
						this.closeModal("viewPunishment");
					}
				}
			);
		},
		...mapActions("modalVisibility", ["closeModal"]),
		...mapActions("modals/viewPunishment", ["viewPunishment"]),
		format,
		formatDistance,
		parseISO
	}
};
</script>
