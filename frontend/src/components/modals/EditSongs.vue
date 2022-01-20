<template>
	<edit-song
		:bulk="true"
		v-if="!closed && currentSong"
		@savedSuccess="onSavedSuccess"
		@savedError="onSavedError"
		@saving="onSaving"
		@toggleFlag="toggleFlag"
		@nextSong="editNextSong"
	>
		<template #toggleMobileSidebar>
			<i
				class="material-icons toggle-sidebar-icon"
				:content="`${
					sidebarMobileActive ? 'Close' : 'Open'
				} Edit Queue`"
				v-tippy
				@click="toggleMobileSidebar()"
				>expand_circle_down</i
			>
		</template>
		<template v-if="items.length > 1" #sidebar>
			<div class="sidebar" :class="{ active: sidebarMobileActive }">
				<header class="sidebar-head">
					<h2 class="sidebar-title is-marginless">Edit Queue</h2>
					<i
						class="material-icons toggle-sidebar-icon"
						:content="`${
							sidebarMobileActive ? 'Close' : 'Open'
						} Edit Queue`"
						v-tippy
						@click="toggleMobileSidebar()"
						>expand_circle_down</i
					>
				</header>
				<section class="sidebar-body">
					<div
						class="item"
						v-for="(
							{ status, flagged, song }, index
						) in filteredItems"
						:key="song._id"
					>
						<song-item
							:song="song"
							:thumbnail="false"
							:duration="false"
							:disabled-actions="
								song.removed ? ['all'] : ['report', 'edit']
							"
							:class="{
								updated: song.updated,
								removed: song.removed
							}"
						>
							<template #leftIcon>
								<i
									v-if="currentSong._id === song._id"
									class="
										material-icons
										item-icon
										editing-icon
									"
									content="Currently editing song"
									v-tippy="{ theme: 'info' }"
									@click="toggleDone(index)"
									>edit</i
								>
								<i
									v-else-if="song.removed"
									class="
										material-icons
										item-icon
										removed-icon
									"
									content="Song removed"
									v-tippy="{ theme: 'info' }"
									>delete_forever</i
								>
								<i
									v-else-if="status === 'error'"
									class="material-icons item-icon error-icon"
									content="Error saving song"
									v-tippy="{ theme: 'info' }"
									@click="toggleDone(index)"
									>error</i
								>
								<i
									v-else-if="status === 'saving'"
									class="material-icons item-icon saving-icon"
									content="Currently saving song"
									v-tippy="{ theme: 'info' }"
									>pending</i
								>
								<i
									v-else-if="flagged"
									class="material-icons item-icon flag-icon"
									content="Song flagged"
									v-tippy="{ theme: 'info' }"
									@click="toggleDone(index)"
									>flag_circle</i
								>
								<i
									v-else-if="status === 'done'"
									class="material-icons item-icon done-icon"
									content="Song marked complete"
									v-tippy="{ theme: 'info' }"
									@click="toggleDone(index)"
									>check_circle</i
								>
								<i
									v-else-if="status === 'todo'"
									class="material-icons item-icon todo-icon"
									content="Song marked todo"
									v-tippy="{ theme: 'info' }"
									@click="toggleDone(index)"
									>cancel</i
								>
							</template>
							<template v-if="!song.removed" #actions>
								<i
									class="material-icons edit-icon"
									content="Edit Song"
									v-tippy
									@click="pickSong(song)"
								>
									edit
								</i>
							</template>
							<template #tippyActions>
								<i
									class="material-icons flag-icon"
									:class="{ flagged }"
									content="Toggle Flag"
									v-tippy
									@click="toggleFlag(index)"
								>
									flag_circle
								</i>
							</template>
						</song-item>
					</div>
					<p v-if="filteredItems.length === 0" class="no-items">
						{{
							flagFilter
								? "No flagged songs queued"
								: "No songs queued"
						}}
					</p>
				</section>
				<footer class="sidebar-foot">
					<button
						@click="toggleFlagFilter()"
						class="button is-primary"
					>
						{{
							flagFilter
								? "Show All Songs"
								: "Show Only Flagged Songs"
						}}
					</button>
				</footer>
			</div>
			<div
				v-if="sidebarMobileActive"
				class="sidebar-overlay"
				@click="toggleMobileSidebar()"
			></div>
		</template>
	</edit-song>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { mapState, mapActions, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";

import SongItem from "@/components/SongItem.vue";

export default {
	components: {
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong")
		),
		SongItem
	},
	props: {},
	data() {
		return {
			items: [],
			currentSong: {},
			closed: false,
			flagFilter: false,
			sidebarMobileActive: false
		};
	},
	computed: {
		editingItemIndex() {
			return this.items.findIndex(
				item => item.song._id === this.currentSong._id
			);
		},
		filteredEditingItemIndex() {
			return this.filteredItems.findIndex(
				item => item.song._id === this.currentSong._id
			);
		},
		filteredItems: {
			get() {
				return this.items.filter(item =>
					this.flagFilter ? item.flagged : true
				);
			},
			set(newItem) {
				const index = this.items.findIndex(
					item => item.song._id === newItem._id
				);
				this.item[index] = newItem;
			}
		},
		...mapState("modals/editSongs", {
			songIds: state => state.songIds,
			songPrefillData: state => state.songPrefillData
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	async mounted() {
		this.socket.dispatch("apis.joinRoom", "edit-songs");

		this.socket.dispatch("songs.getSongsFromSongIds", this.songIds, res => {
			res.data.songs.forEach(song => {
				this.items.push({
					status: "todo",
					flagged: false,
					song
				});
			});

			this.editNextSong();
		});

		this.socket.on(`event:admin.song.updated`, res => {
			const index = this.items
				.map(item => item.song._id)
				.indexOf(res.data.song._id);
			this.items[index].song = {
				...this.items[index].song,
				...res.data.song,
				updated: true
			};
		});

		this.socket.on(`event:admin.song.removed`, res => {
			const index = this.items
				.map(item => item.song._id)
				.indexOf(res.songId);
			this.items[index].song.removed = true;
		});
	},
	beforeUnmount() {
		this.socket.dispatch("apis.leaveRoom", "edit-songs");
	},
	methods: {
		pickSong(song) {
			this.editSong({
				songId: song._id,
				prefill: this.songPrefillData[song._id]
			});
			this.currentSong = song;
			// this.items[
			// 	this.items.findIndex(item => item.song._id === song._id)
			// ].status = "editing";
		},
		closeEditSongs() {
			this.closed = true;
		},
		editNextSong() {
			const currentlyEditingSongIndex = this.filteredEditingItemIndex;
			let newEditingSongIndex = -1;
			const index =
				currentlyEditingSongIndex + 1 === this.filteredItems.length
					? 0
					: currentlyEditingSongIndex + 1;
			for (let i = index; i < this.filteredItems.length; i += 1) {
				if (!this.flagFilter || this.filteredItems[i].flagged) {
					newEditingSongIndex = i;
					break;
				}
			}

			if (newEditingSongIndex > -1)
				this.pickSong(this.filteredItems[newEditingSongIndex].song);
		},
		toggleFlag(songIndex = null) {
			const index = songIndex || this.editingItemIndex;
			if (index > -1)
				this.items[index].flagged = !this.items[index].flagged;
		},
		onSavedSuccess(songId) {
			const itemIndex = this.items.findIndex(
				item => item.song._id === songId
			);
			if (itemIndex > -1) this.toggleDone(itemIndex, "done");
		},
		onSavedError(songId) {
			const itemIndex = this.items.findIndex(
				item => item.song._id === songId
			);
			if (itemIndex > -1) this.items[itemIndex].status = "error";
		},
		onSaving(songId) {
			const itemIndex = this.items.findIndex(
				item => item.song._id === songId
			);
			if (itemIndex > -1) this.items[itemIndex].status = "saving";
		},
		toggleDone(index, overwrite = null) {
			const { status } = this.items[index];

			if (status === "done" && overwrite !== "done")
				this.items[index].status = "todo";
			else {
				this.items[index].status = "done";
				this.items[index].flagged = false;
			}
		},
		toggleFlagFilter() {
			this.flagFilter = !this.flagFilter;
		},
		toggleMobileSidebar() {
			this.sidebarMobileActive = !this.sidebarMobileActive;
		},
		...mapActions("modals/editSong", ["editSong"])
	}
};
</script>

<style lang="scss" scoped>
.toggle-sidebar-icon {
	display: none;
}

.sidebar {
	width: 100%;
	max-width: 350px;
	z-index: 2000;
	display: flex;
	flex-direction: column;
	position: relative;
	height: 100%;
	max-height: calc(100vh - 40px);
	overflow: auto;
	margin-right: 8px;
	border-radius: 5px;

	.sidebar-head,
	.sidebar-foot {
		display: flex;
		flex-shrink: 0;
		position: relative;
		justify-content: flex-start;
		align-items: center;
		padding: 20px;
		background-color: var(--light-grey);
	}

	.sidebar-head {
		border-bottom: 1px solid var(--light-grey-2);
		border-radius: 5px 5px 0 0;

		.sidebar-title {
			display: flex;
			flex: 1;
			margin: 0;
			font-size: 26px;
			font-weight: 600;
		}
	}

	.sidebar-body {
		background-color: var(--white);
		display: flex;
		flex-direction: column;
		row-gap: 8px;
		flex: 1;
		overflow: auto;
		padding: 10px;

		.item {
			display: flex;
			flex-direction: row;
			align-items: center;
			column-gap: 8px;

			/deep/ .song-item {
				.item-icon {
					margin-right: 10px;
					cursor: pointer;
				}

				.removed-icon,
				.error-icon {
					color: var(--red);
				}

				.saving-icon,
				.todo-icon,
				.editing-icon {
					color: var(--primary-color);
				}

				.done-icon {
					color: var(--green);
				}

				.flag-icon {
					color: var(--orange);

					&.flagged {
						color: var(--grey);
					}
				}

				&.removed {
					filter: grayscale(100%);
					cursor: not-allowed;
					user-select: none;
				}
			}
		}

		.no-items {
			text-align: center;
			font-size: 18px;
		}
	}

	.sidebar-foot {
		border-top: 1px solid var(--light-grey-2);
		border-radius: 0 0 5px 5px;

		.button {
			flex: 1;
		}
	}

	.sidebar-overlay {
		display: none;
	}
}

@media only screen and (max-width: 1580px) {
	.toggle-sidebar-icon {
		display: flex;
		margin-right: 5px;
		transform: rotate(90deg);
		cursor: pointer;
	}

	.sidebar {
		display: none;

		&.active {
			display: flex;
			position: absolute;
			z-index: 2010;
			top: 20px;
			left: 20px;

			.sidebar-head .toggle-sidebar-icon {
				display: flex;
				margin-left: 5px;
				transform: rotate(-90deg);
			}
		}
	}

	.sidebar-overlay {
		display: flex;
		position: absolute;
		z-index: 2009;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(10, 10, 10, 0.85);
	}
}
</style>
