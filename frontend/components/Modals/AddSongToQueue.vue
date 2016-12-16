<template>
	<div class="modal is-active">
		<div class="modal-background"></div>
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Add Songs to Station</p>
				<button class="delete" @click="$parent.toggleModal('addSongToQueue')" ></button>
			</header>
			<section class="modal-card-body">
				<aside class='menu' v-if='$parent.$parent.loggedIn && $parent.type === "community"'>
					<ul class='menu-list'>
						<li v-for='playlist in playlists' track-by='$index'>
							<a href='#' target='_blank' @click='$parent.editPlaylist(playlist._id)'>{{ playlist.displayName }}</a>
							<div class='controls'>
								<a href='#' @click='selectPlaylist(playlist._id)' v-if="!isPlaylistSelected(playlist._id)"><i class='material-icons'>panorama_fish_eye</i></a>
								<a href='#' @click='unSelectPlaylist()' v-if="isPlaylistSelected(playlist._id)"><i class='material-icons'>lens</i></a>
							</div>
						</li>
					</ul>
					<br />
				</aside>
				<div class="control is-grouped">
					<p class="control is-expanded">
						<input class="input" type="text" placeholder="YouTube Query" v-model='querySearch' autofocus @keyup.enter='submitQuery()'>
					</p>
					<p class="control">
						<a class="button is-info" @click="submitQuery()" href='#'>
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
								<a class="button is-success" @click="addSongToQueue(result.id)" href='#'>
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
	import io from '../../io';
	import auth from '../../auth';

	export default {
		data() {
			return {
				querySearch: '',
				queryResults: [],
				playlists: [],
				privatePlaylistQueueSelected: null
			}
		},
		methods: {
			isPlaylistSelected: function(playlistId) {
				return this.privatePlaylistQueueSelected === playlistId;
			},
			selectPlaylist: function (playlistId) {
				let _this = this;
				if (_this.$parent.type === 'community') {
					_this.privatePlaylistQueueSelected = playlistId;
					_this.$parent.privatePlaylistQueueSelected = playlistId;
					_this.$parent.addFirstPrivatePlaylistSongToQueue();
				}
			},
			unSelectPlaylist: function () {
				let _this = this;
				if (_this.$parent.type === 'community') {
					_this.privatePlaylistQueueSelected = null;
					_this.$parent.privatePlaylistQueueSelected = null;
				}
			},
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
				let query = _this.querySearch;
				if (query.indexOf('&index=') !== -1) {
					query = query.split('&index=');
					query.pop();
					query = query.join('');
				}
				if (query.indexOf('&list=') !== -1) {
					query = query.split('&list=');
					query.pop();
					query = query.join('');
				}
				_this.socket.emit('apis.searchYoutube', query, results => {
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
			io.getSocket((socket) => {
				_this.socket = socket;
				_this.socket.emit('playlists.indexForUser', res => {
					if (res.status === 'success') _this.playlists = res.data;
				});
				_this.privatePlaylistQueueSelected = _this.$parent.privatePlaylistQueueSelected;
			});
		},
		events: {
			closeModal: function() {
				this.$parent.toggleModal('addSongToQueue')
			}
		}
	}
</script>