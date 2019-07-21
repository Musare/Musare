<template>
	<div class="container">
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
									<th />
									<th>Success</th>
									<th>Error</th>
									<th>Info</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<th><strong>Average per second</strong></th>
									<th :title="logs.second.success">
										{{ round(logs.second.success) }}
									</th>
									<th :title="logs.second.error">
										{{ round(logs.second.error) }}
									</th>
									<th :title="logs.second.info">
										{{ round(logs.second.info) }}
									</th>
								</tr>
								<tr>
									<th><strong>Average per minute</strong></th>
									<th :title="logs.minute.success">
										{{ round(logs.minute.success) }}
									</th>
									<th :title="logs.minute.error">
										{{ round(logs.minute.error) }}
									</th>
									<th :title="logs.minute.info">
										{{ round(logs.minute.info) }}
									</th>
								</tr>
								<tr>
									<th><strong>Average per hour</strong></th>
									<th :title="logs.hour.success">
										{{ round(logs.hour.success) }}
									</th>
									<th :title="logs.hour.error">
										{{ round(logs.hour.error) }}
									</th>
									<th :title="logs.hour.info">
										{{ round(logs.hour.info) }}
									</th>
								</tr>
								<tr>
									<th><strong>Average per day</strong></th>
									<th :title="logs.day.success">
										{{ round(logs.day.success) }}
									</th>
									<th :title="logs.day.error">
										{{ round(logs.day.error) }}
									</th>
									<th :title="logs.day.info">
										{{ round(logs.day.info) }}
									</th>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
		<br />
		<div class="columns">
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<div class="card-content">
					<div class="content">
						<canvas id="minuteChart" height="400" />
					</div>
				</div>
			</div>
		</div>
		<br />
		<div class="columns">
			<div
				class="card column is-10-desktop is-offset-1-desktop is-12-mobile"
			>
				<div class="card-content">
					<div class="content">
						<canvas id="hourChart" height="400" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import io from "../../io";
import Chart from "chart.js";

export default {
	components: {},
	data() {
		return {
			successUnitsPerMinute: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			errorUnitsPerMinute: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			infoUnitsPerMinute: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			successUnitsPerHour: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			errorUnitsPerHour: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			infoUnitsPerHour: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			minuteChart: null,
			hourChart: null,
			logs: {
				second: {
					success: 0,
					error: 0,
					info: 0
				},
				minute: {
					success: 0,
					error: 0,
					info: 0
				},
				hour: {
					success: 0,
					error: 0,
					info: 0
				},
				day: {
					success: 0,
					error: 0,
					info: 0
				}
			}
		};
	},
	mounted: function() {
		let _this = this;
		let minuteCtx = document.getElementById("minuteChart");
		let hourCtx = document.getElementById("hourChart");

		_this.minuteChart = new Chart(minuteCtx, {
			type: "line",
			data: {
				labels: [
					"-10",
					"-9",
					"-8",
					"-7",
					"-6",
					"-5",
					"-4",
					"-3",
					"-2",
					"-1"
				],
				datasets: [
					{
						label: "Success",
						data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						backgroundColor: ["rgba(75, 192, 192, 0.2)"],
						borderColor: ["rgba(75, 192, 192, 1)"],
						borderWidth: 1
					},
					{
						label: "Error",
						data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						backgroundColor: ["rgba(255, 99, 132, 0.2)"],
						borderColor: ["rgba(255,99,132,1)"],
						borderWidth: 1
					},
					{
						label: "Info",
						data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						backgroundColor: ["rgba(54, 162, 235, 0.2)"],
						borderColor: ["rgba(54, 162, 235, 1)"],
						borderWidth: 1
					}
				]
			},
			options: {
				title: {
					display: true,
					text: "Logs per minute"
				},
				scales: {
					yAxes: [
						{
							ticks: {
								beginAtZero: true,
								stepSize: 1
							}
						}
					]
				},
				responsive: true,
				maintainAspectRatio: false
			}
		});

		_this.hourChart = new Chart(hourCtx, {
			type: "line",
			data: {
				labels: [
					"-10",
					"-9",
					"-8",
					"-7",
					"-6",
					"-5",
					"-4",
					"-3",
					"-2",
					"-1"
				],
				datasets: [
					{
						label: "Success",
						data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						backgroundColor: ["rgba(75, 192, 192, 0.2)"],
						borderColor: ["rgba(75, 192, 192, 1)"],
						borderWidth: 1
					},
					{
						label: "Error",
						data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						backgroundColor: ["rgba(255, 99, 132, 0.2)"],
						borderColor: ["rgba(255,99,132,1)"],
						borderWidth: 1
					},
					{
						label: "Info",
						data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						backgroundColor: ["rgba(54, 162, 235, 0.2)"],
						borderColor: ["rgba(54, 162, 235, 1)"],
						borderWidth: 1
					}
				]
			},
			options: {
				title: {
					display: true,
					text: "Logs per hour"
				},
				scales: {
					yAxes: [
						{
							ticks: {
								beginAtZero: true,
								stepSize: 1
							}
						}
					]
				},
				responsive: true,
				maintainAspectRatio: false
			}
		});

		io.getSocket(socket => {
			_this.socket = socket;
			if (_this.socket.connected) _this.init();
			io.onConnect(() => _this.init());
		});
	},
	methods: {
		init: function() {
			this.socket.emit("apis.joinAdminRoom", "statistics", () => {});
			this.socket.on(
				"event:admin.statistics.success.units.minute",
				units => {
					this.successUnitsPerMinute = units;
					this.minuteChart.data.datasets[0].data = units;
					this.minuteChart.update();
				}
			);
			this.socket.on(
				"event:admin.statistics.error.units.minute",
				units => {
					this.errorUnitsPerMinute = units;
					this.minuteChart.data.datasets[1].data = units;
					this.minuteChart.update();
				}
			);
			this.socket.on(
				"event:admin.statistics.info.units.minute",
				units => {
					this.infoUnitsPerMinute = units;
					this.minuteChart.data.datasets[2].data = units;
					this.minuteChart.update();
				}
			);
			this.socket.on(
				"event:admin.statistics.success.units.hour",
				units => {
					this.successUnitsPerHour = units;
					this.hourChart.data.datasets[0].data = units;
					this.hourChart.update();
				}
			);
			this.socket.on("event:admin.statistics.error.units.hour", units => {
				this.errorUnitsPerHour = units;
				this.hourChart.data.datasets[1].data = units;
				this.hourChart.update();
			});
			this.socket.on("event:admin.statistics.info.units.hour", units => {
				this.infoUnitsPerHour = units;
				this.hourChart.data.datasets[2].data = units;
				this.hourChart.update();
			});
			this.socket.on("event:admin.statistics.logs", logs => {
				this.logs = logs;
			});
		},
		round: function(number) {
			return Math.round(number);
		}
	}
};
</script>

<style lang="scss" scoped>
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
	background-color: #029ce3 !important;
}
</style>
