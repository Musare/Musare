<template>
	<div class="container">
		<metadata title="Admin | Statistics" />
		<div class="columns">
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<header class="card-header">
					<p class="card-header-title">Average Logs</p>
				</header>
				<div class="card-content">
					<div class="content">
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
											:to="
												'?moduleName=' + moduleItem.name
											"
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
			</div>
		</div>
		<br />
		<div class="columns" v-if="module">
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<header class="card-header">
					<p class="card-header-title">Running tasks</p>
				</header>
				<div class="card-content">
					<div class="content">
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
			</div>
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<header class="card-header">
					<p class="card-header-title">Paused tasks</p>
				</header>
				<div class="card-content">
					<div class="content">
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
			</div>
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<header class="card-header">
					<p class="card-header-title">Queued tasks</p>
				</header>
				<div class="card-content">
					<div class="content">
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
		</div>
		<br />
		<div class="columns" v-if="module">
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<header class="card-header">
					<p class="card-header-title">Average Logs</p>
				</header>
				<div class="card-content">
					<div class="content">
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
									v-for="(job,
									jobName) in module.jobStatistics"
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
	</div>
</template>

<script>
import io from "../../../io";

export default {
	components: {},
	data() {
		return {
			modules: [],
			module: null
		};
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			if (this.socket.connected) this.init();
			io.onConnect(() => this.init());
		});
	},
	methods: {
		init() {
			this.socket.emit("utils.getModules", data => {
				console.log(data);
				if (data.status === "success") {
					this.modules = data.modules;
				}
			});

			if (this.$route.query.moduleName) {
				this.socket.emit(
					"utils.getModule",
					this.$route.query.moduleName,
					data => {
						console.log(data);
						if (data.status === "success") {
							this.module = {
								runningJobs: data.runningJobs,
								jobStatistics: data.jobStatistics
							};
						}
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

//
<style lang="scss" scoped>
@import "../../../styles/global.scss";

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

body {
	font-family: "Hind", sans-serif;
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
</style>
