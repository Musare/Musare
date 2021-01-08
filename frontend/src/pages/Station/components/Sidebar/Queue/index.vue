<template>
	<div id="queue">
		<div id="queue-items">
			<queue-item
				v-for="song in songsList"
				:key="song.songId"
				:song="song"
				:station="{ type: station.type, partyMode: station.partyMode }"
			/>
			<p class="nothing-here" v-if="songsList.length < 1">
				There are no songs currently queued
			</p>
			<button
				id="add-song-to-queue"
				class="button is-primary"
				v-if="
					loggedIn &&
						((station.type === 'community' &&
							station.partyMode &&
							((station.locked && isOwnerOnly()) ||
								!station.locked ||
								(station.locked &&
									isAdminOnly() &&
									dismissedWarning))) ||
							station.type === 'official')
				"
				@click="
					openModal({
						sector: 'station',
						modal: 'addSongToQueue'
					})
				"
			>
				<i class="material-icons icon-with-button">queue</i>
				<span class="optional-desktop-only-text">
					Add Song To Queue
				</span>
			</button>
			<div
				id="queue-locked"
				v-if="station.type === 'community' && station.locked"
			>
				<button
					v-if="isAdminOnly() && !isOwnerOnly() && !dismissedWarning"
					class="button"
					@click="dismissedWarning = true"
				>
					THIS STATION'S QUEUE IS LOCKED.
				</button>
				<button v-if="!isAdminOnly() && !isOwnerOnly()" class="button">
					THIS STATION'S QUEUE IS LOCKED.
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import { mapActions, mapState } from "vuex";
import Toast from "toasters";

import QueueItem from "./QueueItem.vue";

export default {
	components: { QueueItem },
	data() {
		return {
			dismissedWarning: false
		};
	},
	computed: mapState({
		loggedIn: state => state.user.auth.loggedIn,
		userId: state => state.user.auth.userId,
		userRole: state => state.user.auth.role,
		station: state => state.station.station,
		songsList: state => state.station.songsList,
		noSong: state => state.station.noSong
	}),
	methods: {
		isOwnerOnly() {
			return this.loggedIn && this.userId === this.station.owner;
		},
		isAdminOnly() {
			return this.loggedIn && this.userRole === "admin";
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
@import "../../../../../styles/global.scss";

.night-mode {
	#queue-items {
		background-color: #222 !important;
		border: 0 !important;
	}
}

#queue {
	::-webkit-scrollbar {
		width: 10px;
	}

	::-webkit-scrollbar-track {
		background-color: #fff;
		border: 1px solid $light-grey-2;
	}

	::-webkit-scrollbar-thumb {
		background-color: $dark-grey;

		&:hover {
			background-color: darken($dark-grey, 10%);
		}
	}

	#queue-items {
		background-color: #fff;
		border: 1px solid $light-grey-2;
		border-radius: 0 0 5px 5px;
		width: 100%;
		overflow: auto;
		height: inherit;
		padding: 10px;

		@media (min-width: 1040px) {
			margin-bottom: 20px;
		}

		.queue-item:not(:last-of-type) {
			margin-bottom: 10px;
		}
	}

	#add-song-to-queue {
		width: 100%;
		height: 40px;
		border-radius: 5px;
		background-color: rgba(3, 169, 244, 1);
		color: $white !important;
		border: 0;
		margin-top: 10px;
		&:active,
		&:focus {
			border: 0;
		}

		&:focus {
			background-color: $primary-color;
		}
	}
}
</style>
