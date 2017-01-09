<template>
	<div class='container'>
		<table class='table is-striped'>
			<thead>
				<tr>
					<td>ID</td>
					<td>Type</td>
					<td>Display Name</td>
					<td>Description</td>
					<td>Options</td>
				</tr>
			</thead>
			<tbody>
				<tr v-for='(index, station) in stations' track-by='$index'>
					<td>
						<span>{{ station._id }}</span>
					</td>
					<td>
						<span>{{ station.type }}</span>
					</td>
					<td>
						<span>{{ station.displayName }}</span>
					</td>
					<td>
						<span>{{ station.description }}</span>
					</td>
					<td>
						<a class='button is-info' @click='editStation(station)'>Edit</a>
						<a class='button is-danger' @click='removeStation(index)' href='#'>Remove</a>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
	<div class='container'>
		<div class='card is-fullwidth'>
			<header class='card-header'>
				<p class='card-header-title'>Create official station</p>
			</header>
			<div class='card-content'>
				<div class='content'>
					<div class='control is-horizontal'>
						<div class='control is-grouped'>
							<p class='control is-expanded'>
								<input class='input' type='text' placeholder='Unique Identifier' v-model='newStation._id'>
							</p>
							<p class='control is-expanded'>
								<input class='input' type='text' placeholder='Display Name' v-model='newStation.displayName'>
							</p>
						</div>
					</div>
					<label class='label'>Description</label>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='Short description' v-model='newStation.description'>
					</p>
					<label class='label'>Genres</label>
					<p class='control has-addons'>
						<input class='input' id='new-genre' type='text' placeholder='Genre' v-on:keyup.enter='addGenre()'>
						<a class='button is-info' href='#' @click='addGenre()'>Add genre</a>
					</p>
					<span class='tag is-info' v-for='(index, genre) in newStation.genres' track-by='$index'>
						{{ genre }}
						<button class='delete is-info' @click='removeGenre(index)'></button>
					</span>
					<label class='label'>Blacklisted Genres</label>
					<p class='control has-addons'>
						<input class='input' id='new-blacklisted-genre' type='text' placeholder='Blacklisted Genre' v-on:keyup.enter='addBlacklistedGenre()'>
						<a class='button is-info' href='#' @click='addBlacklistedGenre()'>Add blacklisted genre</a>
					</p>
					<span class='tag is-info' v-for='(index, genre) in newStation.blacklistedGenres' track-by='$index'>
						{{ genre }}
						<button class='delete is-info' @click='removeBlacklistedGenre(index)'></button>
					</span>
				</div>
			</div>
			<footer class='card-footer'>
				<a class='card-footer-item' @click='createStation()' href='#'>Create</a>
			</footer>
		</div>
	</div>

	<edit-station v-show='modals.editStation'></edit-station>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import io from '../../io';

	import EditStation from '../Modals/EditStation.vue';

	export default {
		components: { EditStation },
		data() {
			return {
				stations: [],
				newStation: {
					genres: [],
					blacklistedGenres: []
				},
				modals: { editStation: false }
			}
		},
		methods: {
			toggleModal: function () {
				this.modals.editStation	= !this.modals.editStation;
			},
			createStation: function () {
				let _this = this;
				let { newStation: { _id, displayName, description, genres, blacklistedGenres } } = this;

				if (_id == undefined) return Toast.methods.addToast('Field (YouTube ID) cannot be empty', 3000);
				if (displayName == undefined) return Toast.methods.addToast('Field (Display Name) cannot be empty', 3000);
				if (description == undefined) return Toast.methods.addToast('Field (Description) cannot be empty', 3000);

				_this.socket.emit('stations.create', {
					_id,
					type: 'official',
					displayName,
					description,
					genres,
					blacklistedGenres,
				}, result => {
					Toast.methods.addToast(result.message, 3000);
					if (result.status == 'success') this.newStation = {
						genres: [],
						blacklistedGenres: []
					}
				});
			},
			removeStation: function (index) {
				this.socket.emit('stations.remove', this.stations[index]._id, res => {
					Toast.methods.addToast(res.message, 3000);
				});
			},
			editStation: function (station) {
				this.$broadcast('editStation', {
					_id: station._id,
					type: station.type,
					partyMode: station.partyMode,
					description: station.description,
					privacy: station.privacy,
					displayName: station.displayName
				});
				this.modals.editStation = !this.modals.editStation;
			},
			addGenre: function () {
				let genre = $('#new-genre').val().toLowerCase().trim();
				if (this.newStation.genres.indexOf(genre) !== -1) return Toast.methods.addToast('Genre already exists', 3000);

				if (genre) this.newStation.genres.push(genre);
				else Toast.methods.addToast('Genre cannot be empty', 3000);
			},
			removeGenre: function (index) { this.newStation.genres.splice(index, 1); },
			addBlacklistedGenre: function () {
				let genre = $('#new-blacklisted-genre').val().toLowerCase().trim();
				if (this.newStation.blacklistedGenres.indexOf(genre) !== -1) return Toast.methods.addToast('Genre already exists', 3000);

				if (genre) this.newStation.blacklistedGenres.push(genre);
				else Toast.methods.addToast('Genre cannot be empty', 3000);
			},
			removeBlacklistedGenre: function (index) { this.newStation.blacklistedGenres.splice(index, 1); },
			init: function () {
				let _this = this;
				_this.socket.emit('stations.index', data => {
					_this.stations = data.stations;
				});
				_this.socket.emit('apis.joinAdminRoom', 'stations', data => {});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				if (_this.socket.connected) _this.init();
				_this.socket.on('event:admin.station.added', station => {
					_this.stations.push(station);
				});
				_this.socket.on('event:admin.station.removed', stationId => {
					_this.stations = _this.stations.filter(station => {
						return station._id !== stationId;
					});
				});
				io.onConnect(() => {
					_this.init();
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

	.is-info:focus { background-color: #0398db; }
</style>
