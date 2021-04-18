<template>
	<div id="queue">
		<draggable
			:class="{
				'actionable-button-hidden': !actionableButtonVisible,
				'scrollable-list': true
			}"
			v-if="queue.length > 0"
			v-model="queue"
			v-bind="dragOptions"
			@start="drag = true"
			@end="drag = false"
			@change="repositionSongInQueue"
		>
			<transition-group
				type="transition"
				:name="!drag ? 'draggable-list-transition' : null"
			>
				<song-item
					v-for="(song, index) in queue"
					:key="index + song.youtubeId"
					:song="song"
					:requested-by="
						station.type === 'community' &&
							station.partyMode === true
					"
					:class="{
						'item-draggable': isAdminOnly() || isOwnerOnly()
					}"
				>
					<div
						v-if="isAdminOnly() || isOwnerOnly()"
						class="song-actions"
						slot="actions"
					>
						<confirm
							v-if="isOwnerOnly() || isAdminOnly()"
							placement="left"
							@confirm="removeFromQueue(song.youtubeId)"
						>
							<i
								class="material-icons delete-icon"
								content="Remove Song from Queue"
								v-tippy
								>delete_forever</i
							>
						</confirm>
						<i
							class="material-icons"
							v-if="index > 0"
							@click="moveSongToTop(song, index)"
							content="Move to top of Queue"
							v-tippy
							>vertical_align_top</i
						>
						<i
							v-if="queue.length - 1 !== index"
							@click="moveSongToBottom(song, index)"
							class="material-icons"
							content="Move to bottom of Queue"
							v-tippy
							>vertical_align_bottom</i
						>
					</div>
				</song-item>
			</transition-group>
		</draggable>
		<p class="nothing-here-text" v-else>
			There are no songs currently queued
		</p>
		<button
			class="button is-primary tab-actionable-button"
			v-if="
				loggedIn &&
					station.type === 'community' &&
					station.partyMode &&
					((station.locked && isOwnerOnly()) ||
						!station.locked ||
						(station.locked && isAdminOnly() && dismissedWarning))
			"
			@click="openModal('addSongToQueue')"
		>
			<i class="material-icons icon-with-button">queue</i>
			<span class="optional-desktop-only-text"> Add Song To Queue </span>
		</button>
		<button
			class="button is-primary tab-actionable-button"
			v-if="loggedIn && station.type === 'official'"
			@click="openModal('requestSong')"
		>
			<i class="material-icons icon-with-button">queue</i>
			<span class="optional-desktop-only-text"> Request Song </span>
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
import draggable from "vuedraggable";
import Toast from "toasters";

import SongItem from "@/components/SongItem.vue";
import Confirm from "@/components/Confirm.vue";

export default {
	components: { draggable, SongItem, Confirm },
	data() {
		return {
			dismissedWarning: false,
			actionableButtonVisible: false,
			drag: false
		};
	},
	computed: {
		queue: {
			get() {
				return this.$store.state.station.songsList;
			},
			set(queue) {
				this.$store.commit("station/updateSongsList", queue);
			}
		},
		dragOptions() {
			return {
				animation: 200,
				group: "queue",
				disabled: !(this.isAdminOnly() || this.isOwnerOnly()),
				ghostClass: "draggable-list-ghost"
			};
		},
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
		removeFromQueue(youtubeId) {
			this.socket.dispatch(
				"stations.removeFromQueue",
				this.station._id,
				youtubeId,
				res => {
					if (res.status === "success") {
						new Toast("Successfully removed song from the queue.");
					} else new Toast(res.message);
				}
			);
		},
		repositionSongInQueue({ moved }) {
			if (!moved) return; // we only need to update when song is moved

			this.socket.dispatch(
				"stations.repositionSongInQueue",
				{
					...moved.element,
					oldIndex: moved.oldIndex,
					newIndex: moved.newIndex
				},
				this.station._id,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		moveSongToTop(song, index) {
			this.repositionSongInQueue({
				moved: {
					element: song,
					oldIndex: index,
					newIndex: 0
				}
			});
		},
		moveSongToBottom(song, index) {
			this.repositionSongInQueue({
				moved: {
					element: song,
					oldIndex: index,
					newIndex: this.songsList.length
				}
			});
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
