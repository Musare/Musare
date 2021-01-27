<template>
	<div id="nav-dropdown">
		<div class="nav-dropdown-items" v-if="playlistsArr.length > 0">
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
				v-for="(playlist, index) in playlistsArr"
				:key="index"
				@click.prevent="toggleSongInPlaylist(playlist._id)"
				:title="playlist.displayName"
			>
				<p class="control is-expanded checkbox-control">
					<input
						type="checkbox"
						:id="index"
						v-model="playlists[playlist._id].hasSong"
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
import { mapState } from "vuex";

import Toast from "toasters";
import io from "../../../io";

export default {
	data() {
		return {
			playlists: {},
			playlistsArr: [],
			songId: null,
			song: null
		};
	},
	computed: {
		...mapState("station", {
			currentSong: state => state.currentSong
		})
	},
	mounted() {
		this.songId = this.currentSong.songId;
		this.song = this.currentSong;
		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit("playlists.indexMyPlaylists", false, res => {
				if (res.status === "success") {
					res.data.forEach(playlist => {
						this.playlists[playlist._id] = playlist;
					});

					this.recalculatePlaylists();
				}
			});
		});
	},
	methods: {
		toggleSongInPlaylist(playlistId) {
			if (!this.playlists[playlistId].hasSong) {
				this.socket.emit(
					"playlists.addSongToPlaylist",
					false,
					this.currentSong.songId,
					playlistId,
					res => {
						new Toast({ content: res.message, timeout: 4000 });

						if (res.status === "success") {
							this.playlists[playlistId].songs.push(this.song);
						}

						this.recalculatePlaylists();
					}
				);
			} else {
				this.socket.emit(
					"playlists.removeSongFromPlaylist",
					this.songId,
					playlistId,
					res => {
						new Toast({ content: res.message, timeout: 4000 });

						if (res.status === "success") {
							this.playlists[playlistId].songs.forEach(
								(song, index) => {
									if (song.songId === this.songId)
										this.playlists[playlistId].songs.splice(
											index,
											1
										);
								}
							);
						}

						this.recalculatePlaylists();
					}
				);
			}
		},
		recalculatePlaylists() {
			this.playlistsArr = Object.values(this.playlists).map(playlist => {
				let hasSong = false;
				for (let i = 0; i < playlist.songs.length; i += 1) {
					if (playlist.songs[i].songId === this.songId) {
						hasSong = true;
					}
				}

				playlist.hasSong = hasSong; // eslint-disable-line no-param-reassign
				this.playlists[playlist._id] = playlist;
				return playlist;
			});
		}
	}
};
</script>

<style lang="scss" scoped>
@import "../../../styles/global.scss";

.night-mode {
	.nav-dropdown-items {
		background-color: $dark-grey-2;

		.nav-item {
			background-color: $dark-grey;

			&:focus {
				outline-color: $dark-grey;
			}

			p {
				color: #fff;
			}
		}
	}
}

#nav-dropdown {
	position: absolute;
	margin-left: 4px;
	z-index: 1;
	margin-bottom: 36px;
}

#nav-dropdown-triangle {
	border-style: solid;
	border-width: 15px 15px 0 15px;
	border-color: $dark-grey-2 transparent transparent transparent;
}

.nav-dropdown-items {
	border: 1px solid $light-grey-2;
	border-bottom: 0;
	background-color: #fff;
	padding: 5px;
	border-radius: 5px;

	.nav-item {
		width: 100%;
		justify-content: flex-start;
		border: 0;
		padding: 10px;
		font-size: 15.5px;
		height: 36px;
		background: #eee;
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
					background-color: $white;
					display: inline-block;
					border: 1px solid $dark-grey-2;
					position: relative;
					border-radius: 3px;
				}

				p {
					margin-left: 10px;
					cursor: pointer;
					color: #000;
				}
			}

			input[type="checkbox"]:checked + label span::after {
				content: "";
				width: 18px;
				height: 18px;
				left: 2px;
				top: 2px;
				border-radius: 3px;
				background-color: var(--station-theme);
				position: absolute;
			}
		}

		&:focus {
			outline-color: $light-grey-2;
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
	background-color: #ccc;
	transition: 0.4s;
	border-radius: 34px;

	&:before {
		position: absolute;
		content: "";
		height: 16px;
		width: 16px;
		left: 4px;
		bottom: 4px;
		background-color: white;
		transition: 0.4s;
		border-radius: 50%;
	}
}

input:checked + .slider {
	background-color: $primary-color;
}

input:focus + .slider {
	box-shadow: 0 0 1px $primary-color;
}

input:checked + .slider:before {
	transform: translateX(26px);
}

#no-playlists {
	padding: 10px;
}
</style>
