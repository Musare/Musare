<template>
	<edit-song
		:bulk="true"
		v-if="!closed && currentSong"
		@savedSuccess="onSavedSuccess"
		@savedError="onSavedError"
		@saving="onSaving"
	>
		<template #sidebar>
			<div class="sidebar">
				<header class="sidebar-head">
					<h2 class="sidebar-title is-marginless">Edit Queue</h2>
					<!-- <span class="delete material-icons" @click="closeCurrentModal()"
						>highlight_off</span
					> -->
				</header>
				<section class="sidebar-body">
					<div
						class="item"
						v-for="{ status, flagged, song } in items"
						:key="song._id"
					>
						<i
							class="material-icons item-icon editing-icon"
							v-if="currentSong._id === song._id"
							>edit</i
						>
						<i
							class="material-icons item-icon error-icon"
							v-else-if="status === 'error'"
							>error</i
						>
						<i
							class="material-icons item-icon saving-icon"
							v-else-if="status === 'saving'"
							>pending<!--or we can use change_circle--></i
						>
						<i
							class="material-icons item-icon flag-icon"
							v-else-if="flagged"
							>flag_circle</i
						>
						<i
							class="material-icons item-icon done-icon"
							v-else-if="status === 'done'"
							>check_circle</i
						>
						<i
							class="material-icons item-icon todo-icon"
							v-else-if="status === 'todo'"
							>cancel</i
						>
						<song-item
							:song="song"
							:thumbnail="false"
							:duration="false"
							:disabled-actions="['report']"
						>
							<template #actions>
								<i
									class="material-icons edit-icon"
									content="Edit Song"
									v-tippy
									@click="pickSong(song)"
								>
									edit
								</i>
							</template>
						</song-item>
					</div>
				</section>
				<footer class="sidebar-foot">
					<button @click="closeEditSongs()" class="button is-primary">
						Close
					</button>
				</footer>
			</div>
		</template>
		<template #footer-actions="slotProps">
			<div>
				<button class="button is-primary" @click="editNextSong()">
					Next
				</button>
				<button class="button is-primary" @click="flagSong()">
					Flag
				</button>
			</div>
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
			songIds: [
				"58c8513977eadd0bfc3afced",
				"58c8513977eadd0bfc3afcf3",
				"58c8513977eadd0bfc3afd0c",
				"58c8513977eadd0bfc3afd19",
				"61a208911a62abe1765ed027",
				"61a63326e32fe2f3c76fad61"
			],
			items: [],
			currentSong: {},
			closed: false
		};
	},
	computed: {
		editingItemIndex() {
			return this.items.findIndex(
				item => item.song._id === this.currentSong._id
			);
		},
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	async mounted() {
		this.songIds.forEach(songId => {
			this.socket.dispatch("songs.getSongFromSongId", songId, res => {
				this.items.push({
					status: "todo",
					flagged: false,
					song: res.data.song
				});
			});
		});
	},
	methods: {
		pickSong(song) {
			this.editSong(song._id);
			this.currentSong = song;
			// this.items[
			// 	this.items.findIndex(item => item.song._id === song._id)
			// ].status = "editing";
		},
		closeEditSongs() {
			this.closed = true;
		},
		editNextSong() {
			const currentlyEditingSongIndex = this.editingItemIndex;
			let newEditingSongIndex = -1;

			for (
				let i = currentlyEditingSongIndex + 1;
				i < this.items.length;
				i += 1
			) {
				if (this.items[i].status !== "done") {
					newEditingSongIndex = i;
					break;
				}
			}

			if (newEditingSongIndex > -1)
				this.pickSong(this.items[newEditingSongIndex].song);
			// else edit no song
		},
		flagSong() {
			if (this.editingItemIndex > -1)
				this.items[this.editingItemIndex].flagged = true;
		},
		onSavedSuccess(songId) {
			const itemIndex = this.items.findIndex(
				item => item.song._id === songId
			);
			if (itemIndex > -1) this.items[itemIndex].status = "done";
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
		...mapActions("modals/editSong", ["editSong"])
	}
};
</script>

<style lang="scss" scoped>
.sidebar {
	width: 350px;
	z-index: 2000;
	display: flex;
	flex-direction: column;
	position: relative;
	height: 100%;
	max-height: calc(100vh - 40px);
	overflow: auto;
	margin-right: 8px;
	// padding: 10px;
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

		// .delete.material-icons {
		// 	font-size: 28px;
		// 	cursor: pointer;
		// 	user-select: none;
		// 	-webkit-user-drag: none;
		// 	&:hover,
		// 	&:focus {
		// 		filter: brightness(90%);
		// 	}
		// }
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

			.item-icon {
				font-size: 32px;
				line-height: 32px;
			}

			.error-icon {
				color: var(--red);
			}

			.saving-icon {
				color: var(--primary-color);
			}

			.todo-icon {
				color: var(--primary-color);
			}

			.done-icon {
				color: var(--green);
			}

			.flag-icon {
				color: var(--orange);
			}

			.editing-icon {
				color: var(--primary-color);
			}
		}
	}

	.sidebar-foot {
		border-top: 1px solid var(--light-grey-2);
		border-radius: 0 0 5px 5px;
		overflow: initial;
		column-gap: 16px;

		// & > div {
		// 	display: flex;
		// 	flex-grow: 1;
		// 	column-gap: 16px;
		// }

		// .right {
		// 	display: flex;
		// 	margin-left: auto;
		// 	margin-right: 0;
		// 	justify-content: flex-end;
		// 	column-gap: 16px;
		// }

		// &.blank {
		// 	padding: 10px;
		// }
	}
}
</style>
