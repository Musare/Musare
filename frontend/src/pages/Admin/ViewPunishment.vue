<template>
	<div>
		<modal title="View Punishment">
			<div slot="body" v-if="punishment && punishment._id">
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
			</div>
			<div slot="footer">
				<button
					class="button is-danger"
					@click="
						closeModal({
							sector,
							modal: 'viewPunishment'
						})
					"
				>
					<span>&nbsp;Close</span>
				</button>
			</div>
		</modal>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { format, formatDistance, parseISO } from "date-fns"; // eslint-disable-line no-unused-vars

import Toast from "toasters";
import io from "../../io";
import Modal from "../../components/Modal.vue";
import UserIdToUsername from "../../components/common/UserIdToUsername.vue";

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
		...mapState("viewPunishmentModal", {
			punishment: state => state.punishment
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			this.socket.emit(
				`punishments.getPunishmentById`,
				this.punishmentId,
				res => {
					if (res.status === "success") {
						const punishment = res.data;
						this.viewPunishment(punishment);
					} else {
						new Toast({
							content: "Punishment with that ID not found",
							timeout: 3000
						});
						this.closeModal({
							sector: this.sector,
							modal: "viewPunishment"
						});
					}
				}
			);

			return socket;
		});
	},
	methods: {
		...mapActions("modals", ["closeModal"]),
		...mapActions("viewPunishmentModal", ["viewPunishment"]),
		format,
		formatDistance,
		parseISO
	}
};
</script>
