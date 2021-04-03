<template>
	<tippy
		class="addToPlaylistDropdown"
		interactive="true"
		:placement="placement"
		theme="addToPlaylist"
		trigger="click"
		append-to="parent"
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
				@click.prevent="toggleSongInPlaylist(index, playlist._id)"
				:title="playlist.displayName"
			>
				<p class="control is-expanded checkbox-control">
					<input
						type="checkbox"
						:id="index"
						v-model="playlist.hasSong"
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
				this.checkIfPlaylistsHaveSong();
			}
		});

		this.socket.on("event:songs.next", () => {
			this.checkIfPlaylistsHaveSong();
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
		toggleSongInPlaylist(index, playlistId) {
			if (!this.playlists[index].hasSong) {
				this.socket.dispatch(
					"playlists.addSongToPlaylist",
					false,
					this.song.songId,
					playlistId,
					res => {
						new Toast({ content: res.message, timeout: 4000 });

						if (res.status === "success") {
							this.playlists[index].songs.push(this.song);
							this.playlists[index].hasSong = true;
						}
					}
				);
			} else {
				this.socket.dispatch(
					"playlists.removeSongFromPlaylist",
					this.song.songId,
					playlistId,
					res => {
						new Toast({ content: res.message, timeout: 4000 });

						if (res.status === "success") {
							this.playlists[index].songs.forEach(
								(song, songIndex) => {
									if (song.songId === this.song.songId)
										this.playlists[index].songs.splice(
											songIndex,
											1
										);
								}
							);

							this.playlists[index].hasSong = false;
						}
					}
				);
			}
		},
		checkIfPlaylistsHaveSong() {
			this.playlists.forEach((playlist, index) => {
				let hasSong = false;

				for (let song = 0; song < playlist.songs.length; song += 1) {
					if (playlist.songs[song].songId === this.song.songId)
						hasSong = true;
				}

				this.$set(this.playlists[index], "hasSong", hasSong);
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.nav-dropdown-items {
		background-color: var(--dark-grey-2);
		border: 0 !important;

		.nav-item {
			background-color: var(--dark-grey);

			&:focus {
				outline-color: var(--dark-grey);
			}

			p {
				color: var(--white);
			}

			.checkbox-control label span {
				background-color: var(--dark-grey-2);
			}
		}
	}
}
</style>
