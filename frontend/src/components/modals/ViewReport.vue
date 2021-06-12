<template>
	<modal title="View Report">
		<template #body v-if="report && report._id">
			<router-link
				v-if="$route.query.returnToSong"
				class="button is-dark back-to-song"
				:to="{
					path: '/admin/songs',
					query: { id: report.youtubeId }
				}"
			>
				<i class="material-icons">keyboard_return</i> &nbsp; Edit Song
			</router-link>

			<article class="message">
				<div class="message-body">
					<strong>Song ID:</strong>
					{{ report.song.youtubeId }} / {{ report.song._id }}
					<br />
					<strong>Author:</strong>
					<user-id-to-username
						:user-id="report.createdBy"
						:alt="report.createdBy"
					/>
					<br />
					<strong>Time of report:</strong>
					<span
						:content="report.createdAt"
						v-tippy="{ theme: 'info' }"
					>
						{{
							formatDistance(
								new Date(report.createdAt),
								new Date(),
								{
									addSuffix: true
								}
							)
						}}
					</span>
					<br />
					<span>
						<strong>Category:</strong>
						{{ report.category }}
					</span>
					<br />
					<span>
						<strong>Info:</strong>
						{{ report.info }}
					</span>
				</div>
			</article>
		</template>
		<template #footer v-if="report && report._id">
			<a class="button is-primary" href="#" @click="resolve(report._id)">
				<span>Resolve</span>
			</a>
			<a
				class="button is-primary"
				:href="`/admin/songs?songId=${report.song._id}`"
				target="_blank"
			>
				<span>Go to song</span>
			</a>
		</template>
	</modal>
</template>

<script>
import { mapActions, mapGetters, mapState } from "vuex";
import { formatDistance } from "date-fns";
import Toast from "toasters";

import UserIdToUsername from "../UserIdToUsername.vue";
import Modal from "../Modal.vue";

export default {
	components: { Modal, UserIdToUsername },
	props: {
		reportId: { type: String, default: "" },
		sector: { type: String, default: "admin" }
	},
	computed: {
		...mapState("modals/viewReport", {
			report: state => state.report
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		if (this.$route.query.returnToSong) {
			this.closeModal("editSong");
		}

		this.socket.dispatch(`reports.findOne`, this.reportId, res => {
			if (res.status === "success") {
				const { report } = res.data;
				this.viewReport(report);
			} else {
				new Toast("Report with that ID not found");
				this.closeModal("viewReport");
			}
		});
	},
	methods: {
		formatDistance,
		resolve(reportId) {
			return this.resolveReport(reportId)
				.then(res => {
					if (res.status === "success") this.closeModal("viewReport");
				})
				.catch(err => new Toast(err.message));
		},
		...mapActions("modals/viewReport", ["viewReport", "resolveReport"]),
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.message,
	.table {
		color: var(--light-grey-2);
		background-color: var(--dark-grey-3);
	}

	.table tr:hover {
		filter: brightness(95%);
	}
}

.back-to-song {
	display: flex;
	margin-bottom: 20px;
}
</style>
