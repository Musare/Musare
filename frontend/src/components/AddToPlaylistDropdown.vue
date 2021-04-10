<template>
	<tippy
		class="addToPlaylistDropdown"
		interactive="true"
		:placement="placement"
		theme="addToPlaylist"
		trigger="click"
		append-to="parent"
		@show="
			() => {
				$parent.showPlaylistDropdown = true;
			}
		"
		@hide="
			() => {
				$parent.showPlaylistDropdown = false;
			}
		"
	>
		<template #trigger>
			<slot name="button" />
		</template>
		<div class="nav-dropdown-items" v-if="playlists.length > 0">
			<button
				class="nav-item"
				href="#"
				v-for="(playlist, index) in playlists"
				:key="index"
				@click.prevent="toggleSongInPlaylist(index)"
				:title="playlist.displayName"
			>
				<p class="control is-expanded checkbox-control">
					<input
						type="checkbox"
						:id="index"
						:checked="hasSong(playlist)"
						@click="toggleSongInPlaylist(index)"
					/>
					<label :for="index">
						<span></span>
						<p>{{ playlist.displayName }}</p>
					</label>
				</p>
			</button>
		</div>
		<p v-else>You haven't created any playlists.</p>
	</tippy>
</template>

<script>
import { mapGetters } from "vuex";
import Toast from "toasters";

export default {
	props: {
		song: {
			type: Object,
			default: () => {}
		},
		placement: {
			type: String,
			default: "left"
		}
	},
	data() {
		return {
			playlists: []
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	mounted() {
		this.socket.dispatch("playlists.indexMyPlaylists", false, res => {
			if (res.status === "success") {
				this.playlists = res.data;
			}
		});

		this.socket.on("event:playlist.create", playlist => {
			this.playlists.push(playlist);
		});

		this.socket.on("event:playlist.delete", playlistId => {
			this.playlists.forEach((playlist, index) => {
				if (playlist._id === playlistId) {
					this.playlists.splice(index, 1);
				}
			});
		});

		this.socket.on("event:playlist.updateDisplayName", data => {
			this.playlists.forEach((playlist, index) => {
				if (playlist._id === data.playlistId) {
					this.playlists[index].displayName = data.displayName;
				}
			});
		});
	},
	methods: {
		toggleSongInPlaylist(playlistIndex) {
			const playlist = this.playlists[playlistIndex];
			if (!this.hasSong(playlist)) {
				this.socket.dispatch(
					"playlists.addSongToPlaylist",
					false,
					this.song.songId,
					playlist._id,
					res => {
						new Toast({ content: res.message, timeout: 4000 });

						if (res.status === "success") {
							this.playlists[playlistIndex].songs.push(this.song);
						}
					}
				);
			} else {
				this.socket.dispatch(
					"playlists.removeSongFromPlaylist",
					this.song.songId,
					playlist._id,
					res => {
						new Toast({ content: res.message, timeout: 4000 });

						if (res.status === "success") {
							this.playlists[playlistIndex].songs.forEach(
								(song, songIndex) => {
									if (song.songId === this.song.songId)
										this.playlists[
											playlistIndex
										].songs.splice(songIndex, 1);
								}
							);
						}
					}
				);
			}
		},
		hasSong(playlist) {
			return (
				playlist.songs.map(song => song._id).indexOf(this.song._id) !==
				-1
			);
		}
	}
};
</script>
