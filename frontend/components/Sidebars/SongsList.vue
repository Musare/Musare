<template>
	<div class="sidebar" transition="slide">
		<div class="inner-wrapper">
			<div v-if="$parent.type === 'community'" class="title">
				Queue
			</div>
			<div v-else class="title">
				Playlist
			</div>

			<article v-if="!$parent.noSong" class="media">
				<figure v-if="$parent.currentSong.thumbnail" class="media-left">
					<p class="image is-64x64">
						<img
							:src="$parent.currentSong.thumbnail"
							onerror="this.src='/assets/notes-transparent.png'"
						/>
					</p>
				</figure>
				<div class="media-content">
					<div class="content">
						<p>
							Current Song:
							<strong>{{ $parent.currentSong.title }}</strong>
							<br />
							<small>{{ $parent.currentSong.artists }}</small>
						</p>
					</div>
				</div>
				<div class="media-right">
					{{ $parent.formatTime($parent.currentSong.duration) }}
				</div>
			</article>
			<p v-if="$parent.noSong" class="center">
				There is currently no song playing.
			</p>

			<article
				v-for="(song, index) in $parent.songsList"
				:key="index"
				class="media"
			>
				<div class="media-content">
					<div
						class="content"
						style="display: block;padding-top: 10px;"
					>
						<strong class="songTitle">{{ song.title }}</strong>
						<small>{{ song.artists.join(", ") }}</small>
						<div
							v-if="
								$parent.type === 'community' &&
									$parent.station.partyMode === true
							"
						>
							<small>
								Requested by
								<b>
									<user-id-to-username
										:userId="song.requestedBy"
										:link="true"
									/>
								</b>
							</small>
							<i
								v-if="isOwnerOnly() || isAdminOnly()"
								class="material-icons"
								style="vertical-align: middle;"
								@click="removeFromQueue(song.songId)"
								>delete_forever</i
							>
						</div>
					</div>
				</div>
				<div class="media-right">
					{{ $parent.formatTime(song.duration) }}
				</div>
			</article>
			<div
				v-if="
					$parent.type === 'community' &&
						loggedIn &&
						$parent.station.partyMode === true
				"
			>
				<button
					v-if="
						($parent.station.locked && isOwnerOnly()) ||
							!$parent.station.locked ||
							($parent.station.locked &&
								isAdminOnly() &&
								dismissedWarning)
					"
					class="button add-to-queue"
					@click="
						openModal({
							sector: 'station',
							modal: 'addSongToQueue'
						})
					"
				>
					Add Song to Queue
				</button>
				<button
					v-if="
						$parent.station.locked &&
							isAdminOnly() &&
							!isOwnerOnly() &&
							!dismissedWarning
					"
					class="button add-to-queue add-to-queue-warning"
					@click="dismissedWarning = true"
				>
					THIS STATION'S QUEUE IS LOCKED.
				</button>
				<button
					v-if="
						$parent.station.locked &&
							!isAdminOnly() &&
							!isOwnerOnly()
					"
					class="button add-to-queue add-to-queue-disabled"
				>
					THIS STATION'S QUEUE IS LOCKED.
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import { Toast } from "vue-roaster";

import UserIdToUsername from "../UserIdToUsername.vue";

export default {
	data() {
		return {
			dismissedWarning: false
		};
	},
	computed: mapState({
		loggedIn: state => state.user.auth.loggedIn,
		userId: state => state.user.auth.userId,
		role: state => state.user.auth.role
	}),
	methods: {
		isOwnerOnly() {
			return this.loggedIn && this.userId === this.$parent.station.owner;
		},
		isAdminOnly() {
			return this.loggedIn && this.role === "admin";
		},
		removeFromQueue(songId) {
			window.socket.emit(
				"stations.removeFromQueue",
				this.$parent.station._id,
				songId,
				res => {
					if (res.status === "success") {
						Toast.methods.addToast(
							"Successfully removed song from the queue.",
							4000
						);
					} else Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		...mapActions("modals", ["openModal"])
	},
	mounted() {
		/* let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;

			}); */
	},
	components: { UserIdToUsername }
};
</script>

<style lang="scss" scoped>
.sidebar {
	position: fixed;
	z-index: 1;
	top: 0;
	right: 0;
	width: 300px;
	height: 100vh;
	background-color: #fff;
	box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16),
		0 2px 10px 0 rgba(0, 0, 0, 0.12);
}

.inner-wrapper {
	top: 60px;
	position: relative;
	overflow: auto;
	height: 100%;
}

.slide-transition {
	transition: transform 0.6s ease-in-out;
	transform: translateX(0);
}

.slide-enter,
.slide-leave {
	transform: translateX(100%);
}

.title {
	background-color: rgb(3, 169, 244);
	text-align: center;
	padding: 10px;
	color: white;
	font-weight: 600;
}

.media {
	padding: 0 25px;
}

.media-content .content {
	min-height: 64px;
	display: flex;
	align-items: center;
}

.content p strong {
	word-break: break-word;
}

.content p small {
	word-break: break-word;
}

.add-to-queue {
	width: 100%;
	margin-top: 25px;
	height: 40px;
	border-radius: 0;
	background: rgb(3, 169, 244);
	color: #fff !important;
	border: 0;
	&:active,
	&:focus {
		border: 0;
	}
}

.add-to-queue.add-to-queue-warning {
	background-color: red;
}

.add-to-queue.add-to-queue-disabled {
	background-color: gray;
}
.add-to-queue.add-to-queue-disabled:focus {
	background-color: gray;
}

.add-to-queue:focus {
	background: #029ce3;
}

.media-right {
	line-height: 64px;
}

.songTitle {
	word-wrap: break-word;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-height: 20px;
	max-height: 40px;
}
</style>
