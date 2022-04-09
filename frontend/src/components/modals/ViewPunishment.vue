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
import { mapGetters, mapActions } from "vuex";
import { format, formatDistance, parseISO } from "date-fns";

import Toast from "toasters";
import ws from "@/ws";
import { mapModalState, mapModalActions } from "@/vuex_helpers";

import PunishmentItem from "../PunishmentItem.vue";

export default {
	components: { PunishmentItem },
	props: {
		modalUuid: { type: String, default: "" }
	},
	data() {
		return {
			ban: {}
		};
	},
	computed: {
		...mapModalState("modals/viewPunishment/MODAL_UUID", {
			punishmentId: state => state.punishmentId,
			punishment: state => state.punishment
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);
	},
	beforeUnmount() {
		// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
		this.$store.unregisterModule([
			"modals",
			"viewPunishment",
			this.modalUuid
		]);
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
		...mapModalActions("modals/viewPunishment/MODAL_UUID", [
			"viewPunishment"
		]),
		format,
		formatDistance,
		parseISO
	}
};
</script>
