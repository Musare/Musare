<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useWebsocketsStore } from "@/stores/websockets";

const route = useRoute();

const { socket } = useWebsocketsStore();

const modules = ref([]);
const activeModule = ref();

onMounted(() => {
	socket.onConnect(() => {
		socket.dispatch("utils.getModules", res => {
			if (res.status === "success") modules.value = res.data.modules;
		});

		if (route.query.moduleName) {
			socket.dispatch("utils.getModule", route.query.moduleName, res => {
				if (res.status === "success")
					activeModule.value = {
						runningJobs: res.data.runningJobs,
						jobStatistics: res.data.jobStatistics
					};
			});
		}
	});
});
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | Statistics" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>Statistics</h1>
				<p>Analyze backend server job statistics</p>
			</div>
		</div>
		<div class="card">
			<h4>Average Logs</h4>
			<hr class="section-horizontal-rule" />
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
		<div v-if="activeModule" class="card">
			<h4>Running Tasks</h4>
			<hr class="section-horizontal-rule" />
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
							v-for="job in activeModule.runningTasks"
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
		<div v-if="activeModule" class="card">
			<h4>Paused Tasks</h4>
			<hr class="section-horizontal-rule" />
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
							v-for="job in activeModule.pausedTasks"
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
		<div v-if="activeModule" class="card">
			<h4>Queued Tasks</h4>
			<hr class="section-horizontal-rule" />
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
							v-for="job in activeModule.queuedTasks"
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
		<div v-if="activeModule">
			<div class="card">
				<h4>Average Logs</h4>
				<hr class="section-horizontal-rule" />
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
								v-for="(
									job, jobName
								) in activeModule.jobStatistics"
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

<style lang="less" scoped>
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
}

td {
	vertical-align: middle;
}
</style>
