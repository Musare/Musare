<template>
	<div id="nav-dropdown">
		<div
			class="nav-dropdown-items"
			v-if="playlists.length > 0"
			v-click-outside="() => (this.$parent.showPlaylistDropdown = false)"
		>
			<!-- <a class="nav-item" id="nightmode-toggle">
				<span>Nightmode</span>
				<label class="switch">
					<input type="checkbox" checked />
					<span class="slider round"></span>
				</label>
			</a> -->

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
		<p class="nav-dropdown-items" id="no-playlists" v-else>
			You haven't created any playlists.
		</p>
	</div>
</template>

<script>
import { mapGetters } from "vuex";
import Toast from "toasters";

export default {
	props: {
		song: {
			type: Object,
			default: () => {}
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

#nav-dropdown {
	z-index: 1;
}

#nav-dropdown-triangle {
	border-style: solid;
	border-width: 15px 15px 0 15px;
	border-color: var(--dark-grey-2) transparent transparent transparent;
}

.nav-dropdown-items {
	border: 1px solid var(--light-grey-3);
	box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
	background-color: var(--white);
	padding: 5px;
	border-radius: 5px;
	z-index: 1;

	.nav-item {
		width: 100%;
		justify-content: flex-start;
		border: 0;
		padding: 10px;
		font-size: 15.5px;
		height: 36px;
		background: var(--light-grey);
		border-radius: 5px;
		cursor: pointer;

		.checkbox-control {
			display: flex;
			align-items: center;
			margin-bottom: 0 !important;

			input {
				margin-right: 5px;
			}

			input[type="checkbox"] {
				opacity: 0;
				position: absolute;
			}

			label {
				display: flex;
				flex-direction: row;
				align-items: center;

				span {
					cursor: pointer;
					width: 24px;
					height: 24px;
					background-color: var(--white);
					display: inline-block;
					border: 1px solid var(--dark-grey-2);
					position: relative;
					border-radius: 3px;
				}

				p {
					margin-left: 10px;
					cursor: pointer;
					color: var(--black);
				}
			}

			input[type="checkbox"]:checked + label span::after {
				content: "";
				width: 18px;
				height: 18px;
				left: 2px;
				top: 2px;
				border-radius: 3px;
				background-color: var(--primary-color);
				position: absolute;
			}
		}

		&:focus {
			outline-color: var(--light-grey-3);
		}

		&:not(:last-of-type) {
			margin-bottom: 5px;
		}
	}
}

#nightmode-toggle {
	display: flex;
	justify-content: space-evenly;
}

/*  CSS - Toggle Switch */

.switch {
	position: relative;
	display: inline-block;
	width: 50px;
	height: 24px;

	input {
		opacity: 0;
		width: 0;
		height: 0;
	}
}

.slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: var(--light-grey-3);
	transition: 0.4s;
	border-radius: 34px;

	&:before {
		position: absolute;
		content: "";
		height: 16px;
		width: 16px;
		left: 4px;
		bottom: 4px;
		background-color: var(--white);
		transition: 0.4s;
		border-radius: 50%;
	}
}

input:checked + .slider {
	background-color: var(--primary-color);
}

input:focus + .slider {
	box-shadow: 0 0 1px var(--primary-color);
}

input:checked + .slider:before {
	transform: translateX(26px);
}

#no-playlists {
	padding: 10px;
}
</style>
