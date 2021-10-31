<template>
	<div>
		<modal title="View Punishment">
			<div slot="body">
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
							:userId="punishment.punishedBy"
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
							sector: 'admin',
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

import io from "../../io";
import Modal from "./Modal.vue";
import UserIdToUsername from "../UserIdToUsername.vue";

export default {
	components: { Modal, UserIdToUsername },
	data() {
		return {
			ban: {}
		};
	},
	computed: {
		...mapState("admin/punishments", {
			punishment: state => state.punishment
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			return socket;
		});
	},
	methods: {
		...mapActions("modals", ["closeModal"]),
		format,
		formatDistance,
		parseISO
	}
};
</script>
