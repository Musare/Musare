<template>
	<sidebar :title="station.type === 'community' ? 'Queue' : 'Playlist'">
		<template #content>
			<article v-if="!noSong" class="media">
				<figure v-if="currentSong.thumbnail" class="media-left">
					<p class="image is-64x64">
						<img
							:src="currentSong.thumbnail"
							onerror="this.src='/assets/notes-transparent.png'"
						/>
					</p>
				</figure>
				<div class="media-content">
					<div class="content">
						<p>
							Current Song:
							<strong>{{ currentSong.title }}</strong>
							<br />
							<small>{{ currentSong.artists }}</small>
						</p>
					</div>
				</div>
				<div class="media-right">
					{{ utils.formatTime(currentSong.duration) }}
				</div>
			</article>
			<p v-if="noSong" class="has-text-centered">
				There is currently no song playing.
			</p>
			<hr v-if="noSong" />

			<article
				v-for="song in songsList"
				:key="song.songId"
				class="media"
				:class="{ 'is-playing': currentSong.songId === song.songId }"
			>
				<div class="media-content">
					<div
						class="content"
						style="display: block; padding-top: 10px"
					>
						<strong class="songTitle">{{ song.title }}</strong>
						<small>{{ song.artists.join(", ") }}</small>
						<div
							v-if="
								station.type === 'community' &&
									station.partyMode === true
							"
						>
							<small>
								Requested by
								<b>
									<user-id-to-username
										:user-id="song.requestedBy"
										:link="true"
									/>
								</b>
							</small>
							<i
								v-if="isOwnerOnly() || isAdminOnly()"
								class="material-icons"
								style="vertical-align: middle"
								@click="removeFromQueue(song.songId)"
								>delete_forever</i
							>
						</div>
					</div>
				</div>
				<div class="media-right">
					{{ utils.formatTime(song.duration) }}
				</div>
			</article>
			<div
				v-if="
					station.type === 'community' &&
						loggedIn &&
						station.partyMode === true
				"
			>
				<button
					v-if="
						(station.locked && isOwnerOnly()) ||
							!station.locked ||
							(station.locked &&
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
						station.locked &&
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
					v-if="station.locked && !isAdminOnly() && !isOwnerOnly()"
					class="button add-to-queue add-to-queue-disabled"
				>
					THIS STATION'S QUEUE IS LOCKED.
				</button>
			</div>
		</template>
	</sidebar>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";

import utils from "../../../js/utils";

import Sidebar from "../../components/Sidebar.vue";

import UserIdToUsername from "../../components/common/UserIdToUsername.vue";

export default {
	components: { UserIdToUsername, Sidebar },
	data() {
		return {
			utils,
			dismissedWarning: false
		};
	},
	computed: mapState({
		loggedIn: state => state.user.auth.loggedIn,
		userId: state => state.user.auth.userId,
		role: state => state.user.auth.role,
		station: state => state.station.station,
		currentSong: state => state.station.currentSong,
		songsList: state => state.station.songsList,
		noSong: state => state.station.noSong
	}),
	methods: {
		isOwnerOnly() {
			return this.loggedIn && this.userId === this.station.owner;
		},
		isAdminOnly() {
			return this.loggedIn && this.role === "admin";
		},
		removeFromQueue(songId) {
			window.socket.emit(
				"stations.removeFromQueue",
				this.station._id,
				songId,
				res => {
					if (res.status === "success") {
						new Toast({
							content:
								"Successfully removed song from the queue.",
							timeout: 4000
						});
					} else new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		...mapActions("modals", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.media {
	padding: 0 25px;
}

.media.is-playing {
	background-color: $musare-blue;
	color: white;
}

.media-content .content {
	min-height: 64px;
	display: flex;
	align-items: center;
	color: inherit;
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
	color: $white !important;
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
	background: $primary-color;
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
