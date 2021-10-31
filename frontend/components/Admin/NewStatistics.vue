<template>
	<div class="container">
		<metadata title="Admin | Statistics" />
		<div class="columns">
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<header class="card-header">
					<p class="card-header-title">
						Average Logs
					</p>
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
									<th>Concurrency</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="module_ in modules"
									:key="module_.name"
								>
									<td>
										<router-link
											:to="'?moduleName=' + module_.name"
											>{{ module_.name }}</router-link
										>
									</td>
									<td>{{ module_.status }}</td>
									<td>{{ module_.stage }}</td>
									<td>{{ module_.jobsInQueue }}</td>
									<td>{{ module_.jobsInProgress }}</td>
									<td>{{ module_.concurrency }}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
		<br />
		<div class="columns" v-if="module_">
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<header class="card-header">
					<p class="card-header-title">
						Average Logs
					</p>
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
									v-for="job in module_.runningJobs"
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
		<div class="columns" v-if="module_">
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<header class="card-header">
					<p class="card-header-title">
						Average Logs
					</p>
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
									jobName) in module_.jobStatistics"
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
import io from "../../io";

export default {
	components: {},
	data() {
		return {
			modules: [],
			module_: null
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
							this.module_ = {
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
@import "styles/global.scss";

.night-mode {
	.table {
		color: #ddd;
		background-color: #222;

		thead tr {
			background: $night-mode-secondary;
			td {
				color: #fff;
			}
		}

		tbody tr:hover {
			background-color: #111 !important;
		}

		tbody tr:nth-child(even) {
			background-color: #444;
		}

		strong {
			color: #ddd;
		}
	}

	.card {
		background-color: $night-mode-secondary;

		p {
			color: #ddd;
		}
	}
}

body {
	font-family: "Roboto", sans-serif;
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
	background-color: $primary-color !important;
}
</style>
