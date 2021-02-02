<template>
	<div v-if="isUser">
		<metadata :title="`Profile | ${user.username}`" />
		<edit-playlist v-if="modals.editPlaylist" />
		<create-playlist v-if="modals.createPlaylist" />
		<main-header />
		<div class="container">
			<div class="info-section">
				<div class="picture-name-row">
					<img
						class="profile-picture"
						:src="
							user.avatar.url && user.avatar.type === 'gravatar'
								? `${user.avatar.url}?d=${notes}&s=250`
								: '/assets/notes.png'
						"
						onerror="this.src='/assets/notes.png'; this.onerror=''"
					/>
					<div>
						<div class="name-role-row">
							<p class="name">{{ user.name }}</p>
							<span
								class="role admin"
								v-if="user.role === 'admin'"
								>admin</span
							>
						</div>
						<h2 class="username">@{{ user.username }}</h2>
					</div>
				</div>
				<div
					class="buttons"
					v-if="userId === user._id || role === 'admin'"
				>
					<router-link
						:to="`/admin/users?userId=${user._id}`"
						class="button is-primary"
						v-if="role === 'admin'"
					>
						Edit
					</router-link>
					<router-link
						to="/settings"
						class="button is-primary"
						v-if="userId === user._id"
					>
						Settings
					</router-link>
				</div>
				<div class="bio-row" v-if="user.bio">
					<i class="material-icons">notes</i>
					<p>{{ user.bio }}</p>
				</div>
				<div
					class="date-location-row"
					v-if="user.createdAt || user.location"
				>
					<div class="date" v-if="user.createdAt">
						<i class="material-icons">calendar_today</i>
						<p>{{ user.createdAt }}</p>
					</div>
					<div class="location" v-if="user.location">
						<i class="material-icons">location_on</i>
						<p>{{ user.location }}</p>
					</div>
				</div>
			</div>
			<div class="bottom-section">
				<div class="buttons">
					<button
						:class="{ active: activeTab === 'recentActivity' }"
						@click="switchTab('recentActivity')"
					>
						Recent activity
					</button>
					<button
						:class="{ active: activeTab === 'playlists' }"
						@click="switchTab('playlists')"
					>
						Playlists
					</button>
				</div>
				<div
					class="content recent-activity-tab"
					v-if="activeTab === 'recentActivity'"
				>
					<div v-if="activities.length > 0">
						<div
							class="item activity"
							v-for="activity in sortedActivities"
							:key="activity._id"
						>
							<div class="thumbnail">
								<img :src="activity.thumbnail" alt="" />
								<i class="material-icons activity-type-icon">{{
									activity.icon
								}}</i>
							</div>
							<div class="left-part">
								<p
									class="top-text"
									v-html="activity.message"
								></p>
								<p class="bottom-text">
									{{
										formatDistance(
											parseISO(activity.createdAt),
											new Date(),
											{ addSuffix: true }
										)
									}}
								</p>
							</div>
							<div class="actions">
								<a
									class="hide-icon"
									href="#"
									@click="hideActivity(activity._id)"
								>
									<i class="material-icons">visibility_off</i>
								</a>
							</div>
						</div>
					</div>
					<div v-else>
						<h2>No recent activity.</h2>
					</div>
				</div>
				<div
					class="content playlists-tab"
					v-if="activeTab === 'playlists'"
				>
					<div v-if="playlists.length > 0">
						<div
							class="item playlist"
							v-for="playlist in playlists"
							:key="playlist._id"
						>
							<playlist-item
								v-if="
									playlist.privacy === 'public' ||
										(playlist.privacy === 'private' &&
											playlist.createdBy === userId)
								"
								:playlist="playlist"
							>
								<div v-if="user._id === userId" slot="actions">
									<button
										class="button is-primary"
										@click="editPlaylistClick(playlist._id)"
									>
										<i
											class="material-icons icon-with-button"
											>create</i
										>Edit
									</button>
								</div>
							</playlist-item>
						</div>
						<button
							v-if="user._id === userId"
							class="button is-primary"
							@click="
								openModal({
									sector: 'station',
									modal: 'createPlaylist'
								})
							"
						>
							Create new playlist
						</button>
					</div>
					<div v-else>
						<h2>No playlists here.</h2>
					</div>
				</div>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { format, formatDistance, parseISO } from "date-fns";
import Toast from "toasters";

import PlaylistItem from "../components/ui/PlaylistItem.vue";
import MainHeader from "../components/layout/MainHeader.vue";
import MainFooter from "../components/layout/MainFooter.vue";

import io from "../io";

export default {
	components: {
		MainHeader,
		MainFooter,
		PlaylistItem,
		CreatePlaylist: () => import("../components/modals/CreatePlaylist.vue"),
		EditPlaylist: () => import("../components/modals/EditPlaylist.vue")
	},
	data() {
		return {
			user: {},
			notes: "",
			isUser: false,
			activeTab: "recentActivity",
			playlists: [],
			activities: []
		};
	},
	computed: {
		...mapState({
			role: state => state.user.auth.role,
			userId: state => state.user.auth.userId,
			...mapState("modalVisibility", {
				modals: state => state.modals.station
			})
		}),
		sortedActivities() {
			const { activities } = this;
			return activities.sort(
				(x, y) => new Date(y.createdAt) - new Date(x.createdAt)
			);
		}
	},
	mounted() {
		lofig.get("frontendDomain").then(frontendDomain => {
			this.frontendDomain = frontendDomain;
			this.notes = encodeURI(`${this.frontendDomain}/assets/notes.png`);
		});

		io.getSocket(socket => {
			this.socket = socket;

			this.socket.emit(
				"users.findByUsername",
				this.$route.params.username,
				res => {
					if (res.status === "error") this.$router.go("/404");
					else {
						this.user = res.data;
						this.user.createdAt = format(
							parseISO(this.user.createdAt),
							"MMMM do yyyy"
						);
						this.isUser = true;

						if (this.user._id !== this.userId) {
							this.socket.emit(
								"apis.joinRoom",
								`profile-${res.data._id}`,
								() => {}
							);
						}

						this.socket.emit(
							"playlists.indexForUser",
							this.user._id,
							res => {
								if (res.status === "success")
									this.playlists = res.data;
							}
						);

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

						this.socket.on("event:playlist.addSong", data => {
							this.playlists.forEach((playlist, index) => {
								if (playlist._id === data.playlistId) {
									this.playlists[index].songs.push(data.song);
								}
							});
						});

						this.socket.on("event:playlist.removeSong", data => {
							this.playlists.forEach((playlist, index) => {
								if (playlist._id === data.playlistId) {
									this.playlists[index].songs.forEach(
										(song, index2) => {
											if (song.songId === data.songId) {
												this.playlists[
													index
												].songs.splice(index2, 1);
											}
										}
									);
								}
							});
						});

						this.socket.on(
							"event:playlist.updateDisplayName",
							data => {
								this.playlists.forEach((playlist, index) => {
									if (playlist._id === data.playlistId) {
										this.playlists[index].displayName =
											data.displayName;
									}
								});
							}
						);

						this.socket.on("event:playlist.updatePrivacy", data => {
							this.playlists.forEach((playlist, index) => {
								if (playlist._id === data.playlist._id) {
									this.playlists[index].privacy =
										data.playlist.privacy;
								}
							});
						});

						if (this.user._id === this.userId) {
							this.socket.emit(
								"activities.getSet",
								this.userId,
								1,
								res => {
									if (res.status === "success") {
										for (
											let a = 0;
											a < res.data.length;
											a += 1
										) {
											this.formatActivity(
												res.data[a],
												activity => {
													this.activities.unshift(
														activity
													);
												}
											);
										}
									}
								}
							);

							this.socket.on(
								"event:activity.create",
								activity => {
									console.log(activity);
									this.formatActivity(activity, activity => {
										this.activities.unshift(activity);
									});
								}
							);
						}
					}
				}
			);
		});
	},
	methods: {
		formatDistance,
		parseISO,
		switchTab(tabName) {
			this.activeTab = tabName;
		},
		editPlaylistClick(playlistId) {
			console.log(playlistId);
			this.editPlaylist(playlistId);
			this.openModal({ sector: "station", modal: "editPlaylist" });
		},
		hideActivity(activityId) {
			this.socket.emit("activities.hideActivity", activityId, res => {
				if (res.status === "success") {
					this.activities = this.activities.filter(
						activity => activity._id !== activityId
					);
				} else {
					new Toast({ content: res.message, timeout: 3000 });
				}
			});
		},
		formatActivity(res, cb) {
			console.log("activity", res);

			const icons = {
				created_account: "account_circle",
				created_station: "radio",
				deleted_station: "delete",
				created_playlist: "playlist_add_check",
				deleted_playlist: "delete_sweep",
				liked_song: "favorite",
				added_song_to_playlist: "playlist_add",
				added_songs_to_playlist: "playlist_add"
			};

			const activity = {
				...res,
				thumbnail: "",
				message: "",
				icon: ""
			};

			const plural = activity.payload.length > 1;

			activity.icon = icons[activity.activityType];

			if (activity.activityType === "created_account") {
				activity.message = "Welcome to Musare!";
				return cb(activity);
			}
			if (activity.activityType === "created_station") {
				this.socket.emit(
					"stations.getStationForActivity",
					activity.payload[0],
					res => {
						if (res.status === "success") {
							activity.message = `Created the station <strong>${res.data.title}</strong>`;
							activity.thumbnail = res.data.thumbnail;
							return cb(activity);
						}
						activity.message = "Created a station";
						return cb(activity);
					}
				);
			}
			if (activity.activityType === "deleted_station") {
				activity.message = `Deleted a station`;
				return cb(activity);
			}
			if (activity.activityType === "created_playlist") {
				this.socket.emit(
					"playlists.getPlaylistForActivity",
					activity.payload[0],
					res => {
						if (res.status === "success") {
							activity.message = `Created the playlist <strong>${res.data.title}</strong>`;
							// activity.thumbnail = res.data.thumbnail;
							return cb(activity);
						}
						activity.message = "Created a playlist";
						return cb(activity);
					}
				);
			}
			if (activity.activityType === "deleted_playlist") {
				activity.message = `Deleted a playlist`;
				return cb(activity);
			}
			if (activity.activityType === "liked_song") {
				if (plural) {
					activity.message = `Liked ${activity.payload.length} songs.`;
					return cb(activity);
				}
				this.socket.emit(
					"songs.getSongForActivity",
					activity.payload[0],
					res => {
						if (res.status === "success") {
							activity.message = `Liked the song <strong>${res.data.title}</strong>`;
							activity.thumbnail = res.data.thumbnail;
							return cb(activity);
						}
						activity.message = "Liked a song";
						return cb(activity);
					}
				);
			}
			if (activity.activityType === "added_song_to_playlist") {
				this.socket.emit(
					"songs.getSongForActivity",
					activity.payload[0].songId,
					song => {
						console.log(song);
						this.socket.emit(
							"playlists.getPlaylistForActivity",
							activity.payload[0].playlistId,
							playlist => {
								if (song.status === "success") {
									if (playlist.status === "success")
										activity.message = `Added the song <strong>${song.data.title}</strong> to the playlist <strong>${playlist.data.title}</strong>`;
									else
										activity.message = `Added the song <strong>${song.data.title}</strong> to a playlist`;
									activity.thumbnail = song.data.thumbnail;
									return cb(activity);
								}
								if (playlist.status === "success") {
									activity.message = `Added a song to the playlist <strong>${playlist.data.title}</strong>`;
									return cb(activity);
								}
								activity.message = "Added a song to a playlist";
								return cb(activity);
							}
						);
					}
				);
			}
			if (activity.activityType === "added_songs_to_playlist") {
				activity.message = `Added ${activity.payload.length} songs to a playlist`;
				return cb(activity);
			}
			return false;
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss" scoped>
@import "../styles/global.scss";

@media only screen and (max-width: 1000px) {
	// #page-title {
	// 	margin: 0;
	// 	font-size: 40px;
	// }

	// #sidebar-with-content {
	// 	width: 962px;
	// 	margin: 0 auto;
	// 	margin-top: 30px;
	// 	flex-direction: row;

	// 	.content {
	// 		width: 600px;
	// 		margin-top: 0px !important;
	// 	}
	// }

	.info-section {
		margin-top: 0 !important;

		.picture-name-row {
			flex-direction: column !important;
		}

		.name-role-row {
			margin-top: 24px;
		}

		.buttons .button:not(last-of-type) {
			margin-bottom: 10px;
			margin-right: 5px;
		}

		.date-location-row {
			flex-direction: column;
			width: auto !important;
		}

		.date-location-row > div:nth-child(2),
		.buttons .button:nth-child(2) {
			margin-left: 0 !important;
		}
	}

	.bottom-section {
		flex-direction: column;
	}

	.content {
		margin: 24px 0;
	}
}

.info-section {
	width: 912px;
	max-width: 100%;
	margin-left: auto;
	margin-right: auto;
	margin-top: 32px;
	padding: 24px;

	.picture-name-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		margin-bottom: 24px;
	}

	.profile-picture {
		width: 100px;
		height: 100px;
		border-radius: 100%;
		margin-right: 32px;
	}

	.name-role-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.name {
		font-size: 34px;
		line-height: 40px;
		color: $dark-grey-3;
	}

	.role {
		padding: 2px 24px;
		color: $white;
		text-transform: uppercase;
		font-size: 12px;
		line-height: 14px;
		height: 18px;
		border-radius: 5px;
		margin-left: 12px;

		&.admin {
			background-color: $red;
		}
	}

	.username {
		font-size: 24px;
		line-height: 28px;
		color: $dark-grey;
		margin: 0;
	}

	.buttons {
		width: 388px;
		max-width: 100%;
		display: flex;
		flex-direction: row;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 24px;

		.button {
			flex: 1;
			font-size: 17px;
			line-height: 20px;

			&:nth-child(2) {
				margin-left: 20px;
			}
		}
	}

	.bio-row,
	.date-location-row {
		i {
			font-size: 24px;
			color: $dark-grey-2;
			margin-right: 12px;
		}

		p {
			font-size: 17px;
			line-height: 20px;
			color: $dark-grey-2;
			word-break: break-word;
		}
	}

	.bio-row {
		max-width: 608px;
		margin-bottom: 24px;
		margin-left: auto;
		margin-right: auto;
		display: flex;
		width: max-content;
	}

	.date-location-row {
		max-width: 608px;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 24px;
		display: flex;
		width: max-content;
		margin-bottom: 24px;

		> div:nth-child(2) {
			margin-left: 48px;
		}
	}

	.date,
	.location {
		display: flex;
	}
}

.bottom-section {
	width: 962px;
	max-width: 100%;
	margin-left: auto;
	margin-right: auto;
	margin-top: 32px;
	padding: 24px;
	display: flex;

	.buttons {
		height: 100%;
		width: 250px;
		margin-right: 64px;

		button {
			outline: none;
			border: none;
			box-shadow: none;
			color: $musare-blue;
			font-size: 22px;
			line-height: 26px;
			padding: 7px 0 7px 12px;
			width: 100%;
			text-align: left;
			cursor: pointer;
			border-radius: 5px;
			background-color: transparent;

			&.active {
				color: $white;
				background-color: $musare-blue;
			}
		}
	}

	.content {
		width: 600px;
		max-width: 100%;

		.item {
			height: 72px;
			border: 0.5px $light-grey-2 solid;
			margin-bottom: 12px;
			border-radius: 5px;
			display: flex;
			overflow: hidden;

			.top-text {
				color: $dark-grey-2;
				font-size: 20px;
				line-height: 23px;
				margin-bottom: 0;
			}

			.bottom-text {
				color: $dark-grey-2;
				font-size: 16px;
				line-height: 19px;
				margin-bottom: 0;
				margin-top: 6px;

				&:first-letter {
					text-transform: uppercase;
				}
			}

			.thumbnail {
				position: relative;
				display: flex;
				align-items: center;
				justify-content: center;
				width: 70.5px;
				height: 70.5px;
				background-color: #000;
				z-index: -1;

				img {
					opacity: 0.4;
				}

				.activity-type-icon {
					position: absolute;
					color: #fff;
				}
			}

			.left-part {
				flex: 1;
				padding: 12px;
			}

			.actions {
				display: flex;
				align-items: center;
				padding: 12px;

				.hide-icon {
					border-bottom: 0;
					display: flex;

					i {
						color: #bdbdbd;
					}
				}
			}

			button {
				font-size: 17px;
			}
		}
	}
}

.night-mode {
	.name,
	.username,
	.bio-row i,
	.bio-row p,
	.date-location-row i,
	.date-location-row p,
	.item .left-part .top-text,
	.item .left-part .bottom-text {
		color: $light-grey;
	}
}
</style>
