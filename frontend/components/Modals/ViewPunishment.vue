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
								punishment.expiresAt,
								"MMMM Do YYYY, h:mm:ss a"
							)
						}}
						({{ formatDistance(punishment.expiresAt, new Date()) }})
						<br />
						<strong>Punished at:</strong>
						{{
							format(
								punishment.punishedAt,
								"MMMM Do YYYY, h:mm:ss a"
							)
						}}
						({{
							formatDistance(punishment.punishedAt, new Date())
						}})
						<br />
						<strong>Punished by:</strong>
						{{ punishment.punishedBy }}
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
import { format, formatDistance } from "date-fns"; // eslint-disable-line no-unused-vars

import io from "../../io";
import Modal from "./Modal.vue";

export default {
	components: { Modal },
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
		...mapActions("modals", ["closeModal"])
	}
};
</script>
