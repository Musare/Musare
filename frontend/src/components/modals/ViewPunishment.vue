<template>
	<div>
		<modal title="View Punishment">
			<template #body v-if="punishment && punishment._id">
				<article class="message">
					<div class="message-body">
						<strong>Type:</strong>
						{{ punishment.type }}
						<br />
						<strong>Value:</strong>
						{{ punishment.value }}
						<br />
						<strong>Reason:</strong>
						{{ punishment.reason }}
						<br />
						<strong>Active:</strong>
						{{ punishment.active }}
						<br />
						<strong>Expires at:</strong>
						{{
							format(
								parseISO(punishment.expiresAt),
								"MMMM do yyyy, h:mm:ss a"
							)
						}}
						({{
							formatDistance(
								parseISO(punishment.expiresAt),
								new Date(),
								{ addSuffix: true }
							)
						}})
						<br />
						<strong>Punished at:</strong>
						{{
							format(
								parseISO(punishment.punishedAt),
								"MMMM do yyyy, h:mm:ss a"
							)
						}}
						({{
							formatDistance(
								parseISO(punishment.punishedAt),
								new Date(),
								{ addSuffix: true }
							)
						}})
						<br />
						<strong>Punished by:</strong>
						<user-id-to-username
							:user-id="punishment.punishedBy"
							:alt="punishment.punishedBy"
						/>
						<br />
					</div>
				</article>
			</template>
		</modal>
	</div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import { format, formatDistance, parseISO } from "date-fns"; // eslint-disable-line no-unused-vars

import Toast from "toasters";
import Modal from "../Modal.vue";
import UserIdToUsername from "../UserIdToUsername.vue";

export default {
	components: { Modal, UserIdToUsername },
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
		this.socket.dispatch(
			`punishments.getPunishmentById`,
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
	methods: {
		...mapActions("modalVisibility", ["closeModal"]),
		...mapActions("modals/viewPunishment", ["viewPunishment"]),
		format,
		formatDistance,
		parseISO
	}
};
</script>
