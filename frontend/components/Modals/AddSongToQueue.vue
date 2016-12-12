<template>
	<div class="modal is-active">
		<div class="modal-background"></div>
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Add Songs to Station</p>
				<button class="delete" @click="$parent.toggleModal('addSongToQueue')" ></button>
			</header>
			<section class="modal-card-body">
				<div class="control is-grouped">
					<p class="control is-expanded">
						<input class="input" type="text" placeholder="YouTube Query" v-model="querySearch">
					</p>
					<p class="control">
						<a class="button is-info" @click="submitQuery()">
							Search
						</a>
					</p>
				</div>
				<table class="table">
					<tbody>
						<tr v-for="result in queryResults">
							<td>
								<img :src="result.thumbnail" />
							</td>
							<td>{{ result.title }}</td>
							<td>
								<a class="button is-success" @click="addSongToQueue(result.id)">
									Add
								</a>
							</td>
						</tr>
					</tbody>
				</table>
			</section>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	export default {
		data() {
			return {
				querySearch: '',
				queryResults: []
			}
		},
		methods: {
			addSongToQueue: function (songId) {
				let _this = this;
				if (_this.$parent.type === 'community') {
					_this.socket.emit('stations.addToQueue', _this.$parent.stationId, songId, data => {
						if (data.status !== 'success') {
							Toast.methods.addToast(`Error: ${data.message}`, 8000);
						} else {
							Toast.methods.addToast(`${data.message}`, 4000);
						}
					});
				} else {
					_this.socket.emit('queueSongs.add', songId, data => {
						if (data.status !== 'success') {
							Toast.methods.addToast(`Error: ${data.message}`, 8000);
						} else {
							Toast.methods.addToast(`${data.message}`, 4000);
						}
					});
				}
			},
			submitQuery: function () {
				let _this = this;
				_this.socket.emit('apis.searchYoutube', _this.querySearch, results => {
					results = results.data;
					_this.queryResults = [];
					for (let i = 0; i < results.items.length; i++) {
						_this.queryResults.push({
							id: results.items[i].id.videoId,
							url: `https://www.youtube.com/watch?v=${this.id}`,
							title: results.items[i].snippet.title,
							thumbnail: results.items[i].snippet.thumbnails.default.url
						});
					}
				});
			}
		},
		ready: function () {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.$parent.socket) {
					_this.socket = _this.$parent.$parent.socket;
					clearInterval(socketInterval);
				}
			}, 100);
		},
		events: {
			closeModal: function() {
				this.$parent.toggleModal('addSongToQueue')
			}
		}
	}
</script>