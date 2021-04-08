<template>
	<div id="queue">
		<div
			:class="{
				'actionable-button-hidden': !actionableButtonVisible,
				'scrollable-list': true
			}"
		>
			<song-item
				v-for="(song, index) in songsList"
				:key="index + song.songId"
				:song="song"
				:requested-by="
					station.type === 'community' && station.partyMode === true
				"
			>
				<div
					v-if="isAdminOnly() || isOwnerOnly()"
					class="song-actions"
					slot="actions"
				>
					<i
						v-if="isOwnerOnly() || isAdminOnly()"
						class="material-icons delete-icon"
						@click="removeFromQueue(song.songId)"
						content="Remove Song from Queue"
						v-tippy
						>delete_forever</i
					>
					<i
						class="material-icons"
						v-if="index > 0"
						@click="moveSongToTop(index)"
						content="Move to top of Queue"
						v-tippy
						>vertical_align_top</i
					>
					<i
						v-if="songsList.length - 1 !== index"
						@click="moveSongToBottom(index)"
						class="material-icons"
						content="Move to bottom of Queue"
						v-tippy
						>vertical_align_bottom</i
					>
				</div>
			</song-item>
			<p class="nothing-here-text" v-if="songsList.length < 1">
				There are no songs currently queued
			</p>
		</div>
		<button
			class="button is-primary tab-actionable-button"
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
			<span class="optional-desktop-only-text"> Add Song To Queue </span>
		</button>
		<button
			class="button is-primary tab-actionable-button disabled"
			v-if="
				!loggedIn &&
					((station.type === 'community' &&
						station.partyMode &&
						!station.locked) ||
						station.type === 'official')
			"
			content="Login to add songs to queue"
			v-tippy
		>
			<i class="material-icons icon-with-button">queue</i>
			<span class="optional-desktop-only-text"> Add Song To Queue </span>
		</button>
		<div
			id="queue-locked"
			v-if="station.type === 'community' && station.locked"
		>
			<button
				v-if="isAdminOnly() && !isOwnerOnly() && !dismissedWarning"
				class="button tab-actionable-button"
				@click="dismissedWarning = true"
			>
				THIS STATION'S QUEUE IS LOCKED.
			</button>
			<button
				v-if="!isAdminOnly() && !isOwnerOnly()"
				class="button tab-actionable-button"
			>
				THIS STATION'S QUEUE IS LOCKED.
			</button>
		</div>
	</div>
</template>

<script>
import { mapActions, mapState, mapGetters } from "vuex";
import Toast from "toasters";

import SongItem from "@/components/SongItem.vue";

export default {
	components: { SongItem },
	data() {
		return {
			dismissedWarning: false,
			actionableButtonVisible: false
		};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			userRole: state => state.user.auth.role,
			station: state => state.station.station,
			songsList: state => state.station.songsList,
			noSong: state => state.station.noSong
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	updated() {
		// check if actionable button is visible, if not: set max-height of queue items to 100%
		if (
			document
				.getElementById("queue")
				.querySelectorAll(".tab-actionable-button").length > 0
		)
			this.actionableButtonVisible = true;
		else this.actionableButtonVisible = false;
	},
	methods: {
		isOwnerOnly() {
			return this.loggedIn && this.userId === this.station.owner;
		},
		isAdminOnly() {
			return this.loggedIn && this.userRole === "admin";
		},
		removeFromQueue(songId) {
			this.socket.dispatch(
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
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	#queue {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}
}

#queue {
	background-color: var(--white);
	border-radius: 0 0 5px 5px;

	.actionable-button-hidden {
		max-height: 100%;
	}

	.song-item:not(:last-of-type) {
		margin-bottom: 10px;
	}

	#queue-locked {
		display: flex;
		justify-content: center;
	}

	button.disabled {
		filter: grayscale(0.4);
	}
}
</style>
