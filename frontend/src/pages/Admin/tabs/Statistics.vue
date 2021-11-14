<template>
	<div class="container">
		<page-metadata title="Admin | Statistics" />
		<div class="card">
			<header class="card-header">
				<p>Average Logs</p>
			</header>
			<div class="card-content">
				<table class="table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Status</th>
							<th>Stage</th>
							<th>Jobs in queue</th>
							<th>Jobs in progress</th>
							<th>Jobs paused</th>
							<th>Concurrency</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="moduleItem in modules"
							:key="moduleItem.name"
						>
							<td>
								<router-link
									:to="'?moduleName=' + moduleItem.name"
									>{{ moduleItem.name }}</router-link
								>
							</td>
							<td>{{ moduleItem.status }}</td>
							<td>{{ moduleItem.stage }}</td>
							<td>{{ moduleItem.jobsInQueue }}</td>
							<td>{{ moduleItem.jobsInProgress }}</td>
							<td>{{ moduleItem.jobsPaused }}</td>
							<td>{{ moduleItem.concurrency }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<br />
		<div v-if="module">
			<div class="card">
				<header class="card-header">
					<p>Running tasks</p>
				</header>
				<div class="card-content">
					<table class="table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Payload</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="job in module.runningTasks"
								:key="JSON.stringify(job)"
							>
								<td>{{ job.name }}</td>
								<td>
									{{ JSON.stringify(job.payload) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			<div class="card">
				<header class="card-header">
					<p>Paused tasks</p>
				</header>
				<div class="card-content">
					<table class="table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Payload</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="job in module.pausedTasks"
								:key="JSON.stringify(job)"
							>
								<td>{{ job.name }}</td>
								<td>
									{{ JSON.stringify(job.payload) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			<div class="card">
				<header class="card-header">
					<p>Queued tasks</p>
				</header>
				<div class="card-content">
					<table class="table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Payload</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="job in module.queuedTasks"
								:key="JSON.stringify(job)"
							>
								<td>{{ job.name }}</td>
								<td>
									{{ JSON.stringify(job.payload) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
		<br />
		<div v-if="module">
			<div class="card">
				<header class="card-header">
					<p>Average Logs</p>
				</header>
				<div class="card-content">
					<table class="table">
						<thead>
							<tr>
								<th>Job name</th>
								<th>Successful</th>
								<th>Failed</th>
								<th>Total</th>
								<th>Average timing</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="(job, jobName) in module.jobStatistics"
								:key="jobName"
							>
								<td>{{ jobName }}</td>
								<td>
									{{ job.successful }}
								</td>
								<td>
									{{ job.failed }}
								</td>
								<td>
									{{ job.total }}
								</td>
								<td>
									{{ job.averageTiming }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { mapGetters } from "vuex";

import ws from "@/ws";

export default {
	components: {},
	data() {
		return {
			modules: [],
			module: null
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	mounted() {
		ws.onConnect(this.init);
	},
	methods: {
		init() {
			this.socket.dispatch("utils.getModules", res => {
				if (res.status === "success") this.modules = res.data.modules;
			});

			if (this.$route.query.moduleName) {
				this.socket.dispatch(
					"utils.getModule",
					this.$route.query.moduleName,
					res => {
						if (res.status === "success")
							this.module = {
								runningJobs: res.data.runningJobs,
								jobStatistics: res.data.jobStatistics
							};
					}
				);
			}
		},
		round(number) {
			return Math.round(number);
		}
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.table {
		color: var(--light-grey-2);
		background-color: var(--dark-grey-3);

		thead tr {
			background: var(--dark-grey-3);
			td {
				color: var(--white);
			}
		}

		tbody tr:hover {
			background-color: var(--dark-grey-4) !important;
		}

		tbody tr:nth-child(even) {
			background-color: var(--dark-grey-2);
		}

		strong {
			color: var(--light-grey-2);
		}
	}

	.card {
		background-color: var(--dark-grey-3);

		p {
			color: var(--light-grey-2);
		}
	}
}

.user-avatar {
	display: block;
	max-width: 50px;
	margin: 0 auto;
}

td {
	vertical-align: middle;
}

.is-primary:focus {
	background-color: var(--primary-color) !important;
}

.card {
	display: flex;
	flex-grow: 1;
	flex-direction: column;
	padding: 20px;
	margin: 10px;
	border-radius: 5px;
	background-color: var(--white);
	color: var(--dark-grey);
	box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);

	.card-header {
		font-weight: 700;
		padding-bottom: 10px;
	}
}
</style>
