<template>
	<div class="columns is-mobile">
		<div class="column is-8-desktop is-offset-2-desktop is-12-mobile">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>ID</td>
						<td>Display Name</td>
						<td>Description</td>
						<td>Playlist</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(index, station) in stations" track-by="$index">
						<td>
							<p class="control">
								<input class="input" type="text" :value="station.id" v-model="station.id">
							</p>
						</td>
						<td>
							<p class="control">
								<input class="input" type="text" :value="station.displayName" v-model="station.displayName">
							</p>
						</td>
						<td>
							<p class="control">
								<input class="input" type="text" :value="station.description" v-model="station.description">
							</p>
						</td>
						<td>
							<div class="control">
								<input v-for="song in station.playlist" track-by="$index" class="input" type="text" :value="song.id" v-model="song.id">
							</p>
						</td>
						<td>
							<a class="button is-danger" @click="stations.splice(index, 1)">Remove</a>
						</td>
					</tr>
				</tbody>
			</table>
			<a class="button is-success" @click="update()">Save Changes</a>
		</div>
	</div>
	<div class="columns is-mobile">
		<div class="column is-8-desktop is-offset-2-desktop is-12-mobile">
			<div class="card is-fullwidth">
				<header class="card-header">
					<p class="card-header-title">Create official station</p>
				</header>
				<div class="card-content">
					<div class="content">
						<label class="label">Name</label>
						<div class="control is-horizontal">
							<div class="control is-grouped">
								<p class="control is-expanded">
									<input class="input" type="text" placeholder="Locale name" v-model="newStation.name">
								</p>
								<p class="control is-expanded">
									<input class="input" type="text" placeholder="Display name" v-model="newStation.displayName">
								</p>
							</div>
						</div>
						<label class="label">Description</label>
						<p class="control is-expanded">
							<input class="input" type="text" placeholder="Short description" v-model="newStation.description">
						</p>
						<label class="label">Genres</label>
						<p class="control has-addons">
							<input class="input" type="text" placeholder="Genre" v-model="newStationGenre">
							<a class="button is-info">Add genre</a>
						</p>
						<span class="tag is-info">Bar<button class="delete is-info"></button></span>
						<span class="tag is-info">Bar<button class="delete is-info"></button></span>
						<span class="tag is-info">Bar<button class="delete is-info"></button></span>
					</div>
				</div>
				<footer class="card-footer">
					<a class="card-footer-item" @click="createStation()">Create</a>
				</footer>
			</div>
		</div>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				stations: [],
				newStation: {}
			}
		},
		methods: {
			// saveQueueSongChanges: function() {
			// 	let local = this;
			// 	let songId = local.reviewSongId;
			// 	let songObject = {};
			// 	songObject._id = $("#reviewId").val();
			// 	songObject.title = $("#reviewTitle").val();
			// 	songObject.artists = $("#reviewArtists").val();
			// 	songObject.genres = $("#reviewGenres").val();
			// 	songObject.duration = $("#reviewDuration").val();
			// 	songObject.skipDuration = $("#reviewSkipDuration").val();
			// 	songObject.image = $("#reviewImage").val();
			// 	if (typeof songObject.artists === "string") {
			// 		songObject.artists = songObject.artists.split(", ");
			// 	}
			// 	if (typeof songObject.genres === "string") {
			// 		songObject.genres = songObject.genres.split(", ");
			// 	}
			// 	local.socket.emit("/songs/queue/updateSong/:id", songId, songObject, function(data) {
			// 		console.log(data);
			// 	});
			// },
			createStation: function() {
				let _this = this;
				let { newStation: { name, displayName, description } } = this;
				let data = { name, displayName, description, genres: ['edm'] };
				_this.socket.emit('stations.create', data, result => {
					console.log(result);
				});
			}
		},
		ready: function() {
			let socket = this.socket = this.$parent.$parent.socket;
			socket.emit("stations.index", (data) => {
				console.log(data);
				this.stations = data;
			});
			console.log('ready');
		}
	}
</script>

<style lang="scss" scoped>
	.is-success {
		width: 100%;
	}
</style>
