<template>
	<div class="columns is-mobile">
		<div class="column is-8-desktop is-offset-2-desktop is-12-mobile">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>YouTube ID</td>
						<td>Title</td>
						<td>Thumbnail</td>
						<td>Artists</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(index, song) in songs" track-by="$index">
						<td>
							<p class="control">
								<input class="input" type="text" :value="song.id" v-model="song.id">
							</p>
						</td>
						<td>
							<p class="control">
								<input class="input" type="text" :value="song.title" v-model="song.title">
							</p>
						</td>
						<td>
							<p class="control">
								<input class="input" type="text" :value="song.thumbnail" v-model="song.thumbnail">
							</p>
						</td>
						<td>
							<div class="control">
								<input v-for="artist in song.artists" track-by="$index" class="input" type="text" :value="artist" v-model="artist">
							</div>
						</td>
						<td>
							<a class="button is-danger" @click="remove(song, index)">Remove</a>
							<a class="button is-success" @click="update(song)">Save Changes</a>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				songs: []
			}
		},
		methods: {
			update (song) {
				this.socket.emit('queueSongs.update', song);
			},
			remove (songId) {
				this.socket.emit('queueSongs.remove', songId);
			}
		},
		ready: function() {
			let _this = this;
			_this.socket = _this.$parent.$parent.socket;
			_this.socket.emit('queueSongs.index', (data) => {
				console.log(data);
				_this.songs = data;
			});
		}
	}
</script>

<style lang="scss" scoped>
</style>
