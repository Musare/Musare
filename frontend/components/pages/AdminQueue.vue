<template>
	<div class="app">
		<main-header></main-header>
		<table>
			<thead>
				<tr>
					<td>Title</td>
					<td>Artists</td>
					<td>Genre's</td>
					<td>Controls</td>
				</tr>
			</thead>
			<tbody>
				<tr v-for="song in songs">
					<td>{{song.title}}</td>
					<td>{{song.artists}}</td>
					<td>{{song.genres}}</td>
					<td><button @click="reviewSong(song._id)">Review</button></td>
				</tr>
			</tbody>
		</table>
		<main-footer></main-footer>
		<div class="modal fade" id="reviewModal" tabindex="-1" role="dialog" aria-labelledby="review-modal">
			<div class="modal-dialog modal-large" role="document">
				<div class="modal-content">
					<div class="modal-header">
						<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
						<h5 class="modal-title">Review</h5>
					</div>
					<div class="modal-body">
						<label for="reviewId">ID</label>
						<input type="text" v-bind:value="reviewSongObject._id" id="reviewId"/><br>
						<label for="reviewTitle">Title</label>
						<input type="text" v-bind:value="reviewSongObject.title" id="reviewTitle"/><br>
						<label for="reviewArtists">Artists</label>
						<input type="text" v-bind:value="reviewSongObject.artists" id="reviewArtists"/><br>
						<label for="reviewGenres">Genres</label>
						<input type="text" v-bind:value="reviewSongObject.genres" id="reviewGenres"/><br>
						<label for="reviewDuration">Duration</label>
						<input type="number" v-bind:value="reviewSongObject.duration" id="reviewDuration"/><br>
						<label for="reviewSkipDuration">Skip Duration</label>
						<input type="number" v-bind:value="reviewSongObject.skipDuration" id="reviewSkipDuration"/><br>
						<label for="reviewImage">Image</label>
						<input type="text" v-bind:value="reviewSongObject.image" id="reviewImage"/>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-primary left" @click="saveQueueSongChanges()">Save</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue'
	import MainFooter from '../MainFooter.vue'

	export default {
		components: { MainHeader, MainFooter },
		data() {
			return {
				songs: [],
				reviewSongObject: {},
				reviewSongId: ""
			}
		},
		methods: {
			reviewSong: function(id) {
				let local = this;
				local.reviewSongObject = {};
				local.reviewSongId = "";
				local.songs.forEach(function(song) {
					if (song._id === id) {
						for (var prop in song) {
							local.reviewSongObject[prop] = song[prop];
						}
						local.reviewSongId = id;
						$('#reviewModal').modal('show');
					}
				});
			},
			saveQueueSongChanges: function() {
				let local = this;
				let songId = local.reviewSongId;
				let songObject = {};
				songObject._id = $("#reviewId").val();
				songObject.title = $("#reviewTitle").val();
				songObject.artists = $("#reviewArtists").val();
				songObject.genres = $("#reviewGenres").val();
				songObject.duration = $("#reviewDuration").val();
				songObject.skipDuration = $("#reviewSkipDuration").val();
				songObject.image = $("#reviewImage").val();
				if (typeof songObject.artists === "string") {
					songObject.artists = songObject.artists.split(", ");
				}
				if (typeof songObject.genres === "string") {
					songObject.genres = songObject.genres.split(", ");
				}
				local.socket.emit("/songs/queue/updateSong/:id", songId, songObject, function(data) {
					console.log(data);
				});
			}
		},
		ready: function() {
			let local = this;
			local.socket = this.$parent.socket;
			local.socket.emit("/songs/queue/getSongs", function(data) {
				local.songs = data.songs;
			});
		}
	}
</script>

<style lang="sass">

</style>
