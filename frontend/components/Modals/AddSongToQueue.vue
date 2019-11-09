<template>
	<modal title="Add Song To Queue">
		<div slot="body">
			<aside class="menu" v-if="loggedIn && station.type === 'community'">
				<ul class="menu-list">
					<li v-for="(playlist, index) in playlists" :key="index">
						<a href="#" v-on:click="editPlaylist(playlist._id)">{{
							playlist.displayName
						}}</a>
						<div class="controls">
							<a
								href="#"
								v-on:click="selectPlaylist(playlist._id)"
								v-if="!isPlaylistSelected(playlist._id)"
							>
								<i class="material-icons">panorama_fish_eye</i>
							</a>
							<a
								href="#"
								v-on:click="unSelectPlaylist()"
								v-if="isPlaylistSelected(playlist._id)"
							>
								<i class="material-icons">lens</i>
							</a>
						</div>
					</li>
				</ul>
				<br />
			</aside>
			<div class="control is-grouped">
				<p class="control is-expanded">
					<input
						class="input"
						type="text"
						placeholder="YouTube Query"
						v-model="querySearch"
						autofocus
						@keyup.enter="submitQuery()"
					/>
				</p>
				<p class="control">
					<a
						class="button is-info"
						v-on:click="submitQuery()"
						href="#"
						>Search</a
					>
				</p>
			</div>
			<div class="control is-grouped" v-if="station.type === 'official'">
				<p class="control is-expanded">
					<input
						class="input"
						type="text"
						placeholder="YouTube Playlist URL"
						v-model="importQuery"
						@keyup.enter="importPlaylist()"
					/>
				</p>
				<p class="control">
					<a
						class="button is-info"
						v-on:click="importPlaylist()"
						href="#"
						>Import</a
					>
				</p>
			</div>
			<table class="table" v-if="queryResults.length > 0">
				<tbody>
					<tr v-for="(result, index) in queryResults" :key="index">
						<td>
							<img :src="result.thumbnail" />
						</td>
						<td>{{ result.title }}</td>
						<td>
							<a
								class="button is-success"
								v-on:click="addSongToQueue(result.id)"
								href="#"
								>Add</a
							>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</modal>
</template>

<script>
import { mapState, mapActions } from "vuex";

import Toast from "toasters";
import Modal from "./Modal.vue";
import io from "../../io";

export default {
	data() {
		return {
			querySearch: "",
			queryResults: [],
			playlists: [],
			importQuery: ""
		};
	},
	computed: mapState({
		loggedIn: state => state.user.auth.loggedIn,
		station: state => state.station.station,
		privatePlaylistQueueSelected: state =>
			state.station.privatePlaylistQueueSelected
	}),
	methods: {
		isPlaylistSelected(playlistId) {
			return this.privatePlaylistQueueSelected === playlistId;
		},
		selectPlaylist(playlistId) {
			if (this.station.type === "community") {
				this.updatePrivatePlaylistQueueSelected(playlistId);
				this.$parent.addFirstPrivatePlaylistSongToQueue();
			}
		},
		unSelectPlaylist() {
			if (this.station.type === "community") {
				this.updatePrivatePlaylistQueueSelected(null);
			}
		},
		addSongToQueue(songId) {
			console.log(this.station.type);
			if (this.station.type === "community") {
				this.socket.emit(
					"stations.addToQueue",
					this.station._id,
					songId,
					data => {
						if (data.status !== "success")
							new Toast({
								content: `Error: ${data.message}`,
								timeout: 8000
							});
						else
							new Toast({
								content: `${data.message}`,
								timeout: 4000
							});
					}
				);
			} else {
				this.socket.emit("queueSongs.add", songId, data => {
					if (data.status !== "success")
						new Toast({
							content: `Error: ${data.message}`,
							timeout: 8000
						});
					else
						new Toast({
							content: `${data.message}`,
							timeout: 4000
						});
				});
			}
		},
		importPlaylist() {
			new Toast({
				content:
					"Starting to import your playlist. This can take some time to do.",
				timeout: 4000
			});
			this.socket.emit(
				"queueSongs.addSetToQueue",
				this.importQuery,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		submitQuery() {
			let query = this.querySearch;
			if (query.indexOf("&index=") !== -1) {
				query = query.split("&index=");
				query.pop();
				query = query.join("");
			}
			if (query.indexOf("&list=") !== -1) {
				query = query.split("&list=");
				query.pop();
				query = query.join("");
			}
			this.socket.emit("apis.searchYoutube", query, res => {
				// check for error
				const { data } = res;
				this.queryResults = [];
				for (let i = 0; i < data.items.length; i += 1) {
					this.queryResults.push({
						id: data.items[i].id.videoId,
						url: `https://www.youtube.com/watch?v=${this.id}`,
						title: data.items[i].snippet.title,
						thumbnail: data.items[i].snippet.thumbnails.default.url
					});
				}
			});
		},
		...mapActions("station", ["updatePrivatePlaylistQueueSelected"]),
		...mapActions("user/playlists", ["editPlaylist"])
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit("playlists.indexForUser", res => {
				if (res.status === "success") this.playlists = res.data;
			});
		});
	},
	components: { Modal }
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

tr td {
	vertical-align: middle;

	img {
		width: 55px;
	}
}

.table {
	margin-bottom: 0;
}
</style>
