<template>
	<modal title="Report">
		<div slot="body">
			<router-link
				v-if="$route.query.returnToSong"
				class="button is-dark back-to-song"
				:to="{
					path: '/admin/songs',
					query: { id: report.songId }
				}"
			>
				<i class="material-icons">keyboard_return</i> &nbsp; Edit Song
			</router-link>

			<article class="message">
				<div class="message-body">
					<strong>Song ID:</strong>
					{{ report.songId }}
					<br />
					<strong>Created By:</strong>
					{{ report.createdBy }}
					<br />
					<strong>Created At:</strong>
					{{ report.createdAt }}
					<br />
					<span v-if="report.description">
						<strong>Description:</strong>
						{{ report.description }}
					</span>
				</div>
			</article>
			<table v-if="report.issues.length > 0" class="table is-narrow">
				<thead>
					<tr>
						<td>Issue</td>
						<td>Reasons</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(issue, index) in report.issues" :key="index">
						<td>
							<span>{{ issue.name }}</span>
						</td>
						<td>
							<span>{{ issue.reasons }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div slot="footer">
			<a
				class="button is-primary"
				href="#"
				@click="$parent.resolve(report._id)"
			>
				<span>Resolve</span>
			</a>
			<a
				class="button is-danger"
				@click="
					closeModal({
						sector: 'admin',
						modal: 'viewReport'
					})
				"
				href="#"
			>
				<span>Cancel</span>
			</a>
		</div>
	</modal>
</template>

<script>
import { mapActions, mapState } from "vuex";

import Modal from "./Modal.vue";

export default {
	computed: {
		...mapState("admin/reports", {
			report: state => state.report
		})
	},
	mounted() {
		if (this.$route.query.returnToSong) {
			this.closeModal({ sector: "admin", modal: "editSong" });
		}
	},
	methods: {
		...mapActions("modals", ["closeModal"])
	},
	components: { Modal }
};
</script>

<style lang="scss">
@import "styles/global.scss";

.back-to-song {
	display: flex;
	margin-bottom: 20px;
}
</style>
