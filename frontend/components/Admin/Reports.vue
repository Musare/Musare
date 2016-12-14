<template>
	<div class='columns is-mobile'>
		<div class='column is-8-desktop is-offset-2-desktop is-12-mobile'>
			<table class='table is-striped'>
				<thead>
					<tr>
						<td>Song ID</td>
						<td>Created By</td>
						<td>Created At</td>
						<td>Description</td>
						<td>Issues</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for='(index, report) in reports' track-by='$index'>
						<td>
							<span>{{ report.songId }}</span>
						</td>
						<td>
							<span>{{ report.createdBy }}</span>
						</td>
						<td>
							<span>{{ report.createdAt }}</span>
						</td>
						<td>
							<span>{{ report.description }}</span>
						</td>
						<td>
							<span>{{ report.issues }}</span>
						</td>
						<td>
							<a class='button is-primary' @click='resolve()'>Resolve</a>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import io from '../../io';

	export default {
		data() {
			return {
				reports: []
			}
		},
		methods: {},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				_this.socket.emit('reports.index', res => {
					_this.reports = res.data;
				});
			});
		}
	}
</script>

<style lang='scss' scoped>
	.tag:not(:last-child) { margin-right: 5px; }

	td {
		word-wrap: break-word;
		max-width: 10vw;
		vertical-align: middle;
	}
</style>
