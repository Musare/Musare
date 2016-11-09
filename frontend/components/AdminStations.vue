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
							<div class="control is-horizontal">
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
</template>

<script>
	export default {
		data() {
			return {
				stations: []
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
			// }
		},
		ready: function() {
			let local = this;
			local.socket = local.$parent.$parent.socket;
			local.socket.emit("/stations", function(data) {
				local.stations = data;
			});
		}
	}
</script>

<style lang="scss" scoped>
	.is-success {
		width: 100%;
	}
</style>
