<template>
	<div id="queue">
		<div
			v-if="queue.length > 0"
			:class="{
				'actionable-button-hidden': !actionableButtonVisible,
				'scrollable-list': true
			}"
		>
			<draggable
				tag="transition-group"
				:component-data="{
					name: !drag ? 'draggable-list-transition' : null
				}"
				v-model="queue"
				item-key="_id"
				v-bind="dragOptions"
				@start="drag = true"
				@end="drag = false"
				@change="repositionSongInQueue"
			>
				<template #item="{ element, index }">
					<song-item
						:song="element"
						:requested-by="true"
						:class="{
							'item-draggable': isAdminOnly() || isOwnerOnly()
						}"
						:disabled-actions="[]"
						:ref="`song-item-${index}`"
					>
						<template
							v-if="isAdminOnly() || isOwnerOnly()"
							#tippyActions
						>
							<quick-confirm
								v-if="isOwnerOnly() || isAdminOnly()"
								placement="left"
								@confirm="removeFromQueue(element.youtubeId)"
							>
								<i
									class="material-icons delete-icon"
									content="Remove Song from Queue"
									v-tippy
									>delete_forever</i
								>
							</quick-confirm>
							<i
								class="material-icons"
								v-if="index > 0"
								@click="moveSongToTop(element, index)"
								content="Move to top of Queue"
								v-tippy
								>vertical_align_top</i
							>
							<i
								v-if="queue.length - 1 !== index"
								@click="moveSongToBottom(element, index)"
								class="material-icons"
								content="Move to bottom of Queue"
								v-tippy
								>vertical_align_bottom</i
							>
						</template>
					</song-item>
				</template>
			</draggable>
		</div>
		<p class="nothing-here-text" v-else>
			There are no songs currently queued
		</p>
	</div>
</template>

<script>
import { mapActions, mapState, mapGetters } from "vuex";
import draggable from "vuedraggable";
import Toast from "toasters";

import SongItem from "@/components/SongItem.vue";
import QuickConfirm from "@/components/QuickConfirm.vue";

export default {
	components: { draggable, SongItem, QuickConfirm },
	props: {
		sector: {
			type: String,
			default: "station"
		}
	},
	data() {
		return {
			actionableButtonVisible: false,
			drag: false
		};
	},
	computed: {
		queue: {
			get() {
				if (this.sector === "manageStation")
					return this.$store.state.modals.manageStation.songsList;
				return this.$store.state.station.songsList;
			},
			set(queue) {
				if (this.sector === "manageStation")
					this.$store.commit(
						"modals/manageStation/updateSongsList",
						queue
					);
				else this.$store.commit("station/updateSongsList", queue);
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
			station(state) {
				return this.sector === "station"
					? state.station.station
					: state.modals.manageStation.station;
			},
			songsList(state) {
				return this.sector === "station"
					? state.station.songsList
					: state.modals.manageStation.songsList;
			},
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
					if (res.status === "success")
						new Toast("Successfully removed song from the queue.");
					else new Toast(res.message);
				}
			);
		},
		repositionSongInQueue({ moved }) {
			if (!moved) return; // we only need to update when song is moved

			this.socket.dispatch(
				"stations.repositionSongInQueue",
				this.station._id,
				{
					...moved.element,
					oldIndex: moved.oldIndex,
					newIndex: moved.newIndex
				},
				res => {
					new Toast({ content: res.message, timeout: 4000 });
					if (res.status !== "success")
						this.repositionSongInList({
							...moved.element,
							newIndex: moved.oldIndex,
							oldIndex: moved.newIndex
						});
				}
			);
		},
		moveSongToTop(song, index) {
			this.$refs[`song-item-${index}`].$refs.songActions.tippy.hide();

			this.repositionSongInQueue({
				moved: {
					element: song,
					oldIndex: index,
					newIndex: 0
				}
			});
		},
		moveSongToBottom(song, index) {
			this.$refs[`song-item-${index}`].$refs.songActions.tippy.hide();

			this.repositionSongInQueue({
				moved: {
					element: song,
					oldIndex: index,
					newIndex: this.songsList.length
				}
			});
		},
		...mapActions({
			repositionSongInList(dispatch, payload) {
				if (this.sector === "manageStation")
					return dispatch(
						"modals/manageStation/repositionSongInList",
						payload
					);

				return dispatch("station/repositionSongInList", payload);
			}
		}),
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions({
			showManageStationTab: "modals/manageStation/showTab"
		})
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	#queue {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}
}

#queue {
	background-color: var(--white);
	border-radius: 0 0 @border-radius @border-radius;
	user-select: none;

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
