<template>
	<div class="content recent-activity-tab">
		<div v-if="activities.length > 0">
			<h4 class="section-title">Recent activity</h4>

			<p class="section-description">
				This is a log of all actions
				{{ userId === myUserId ? "you have" : `${username} has` }}
				taken recently.
			</p>

			<hr class="section-horizontal-rule" />

			<activity-item
				class="item activity-item universal-item"
				v-for="activity in sortedActivities"
				:key="activity._id"
				:activity="activity"
			>
				<div slot="actions">
					<a href="#" @click.prevent="hideActivity(activity._id)">
						<i class="material-icons hide-icon">visibility_off</i>
					</a>
				</div>
			</activity-item>
		</div>
		<div v-else>
			<h3>No recent activity.</h3>
		</div>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";

import io from "../../../io";

import ActivityItem from "../../../components/ui/ActivityItem.vue";

export default {
	components: { ActivityItem },
	props: {
		userId: {
			type: String,
			default: ""
		}
	},
	computed: {
		sortedActivities() {
			const { activities } = this;
			return activities.sort(
				(x, y) => new Date(y.createdAt) - new Date(x.createdAt)
			);
		},
		...mapState({
			activities: state => state.user.activities.activities,
			...mapState("modalVisibility", {
				modals: state => state.modals.station
			}),
			myUserId: state => state.user.auth.userId,
			username: state => state.user.auth.username
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			if (this.myUserId !== this.userId) {
				this.socket.emit(
					"apis.joinRoom",
					`profile-${this.userId}-activities`,
					() => {}
				);
			}

			this.socket.emit("activities.getSet", this.userId, 1, res => {
				if (res.status === "success") {
					// for (let a = 0; a < res.data.length; a += 1) {
					// 	this.formatActivity(res.data[a], activity => {
					// 		this.activities.unshift(activity);
					// 	});
					// }
					this.getSetOfActivities({
						activities: res.data,
						set: 1
					});
				}
			});

			this.socket.on("event:activity.create", activity => {
				console.log("activity created (socket event): ", activity);
				this.formatActivity(activity, activity => {
					this.activities.unshift(activity);
				});
			});
		});
	},
	methods: {
		hideActivity(activityId) {
			this.socket.emit("activities.hideActivity", activityId, res => {
				if (res.status === "success")
					return this.removeActivity(activityId);
				return new Toast({ content: res.message, timeout: 3000 });
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
		...mapActions("user/activities", [
			"getSetOfActivities",
			"removeActivity"
		])
	}
};
</script>
