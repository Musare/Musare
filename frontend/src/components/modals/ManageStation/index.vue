<template>
	<modal title="Manage Station" class="manage-station-modal">
		<template #body>
			<div class="custom-modal-body" v-if="station && station._id">
				<div class="left-section">
					<div class="section tabs-container">
						<div class="tab-selection">
							<button
								class="button is-default"
								:class="{ selected: tab === 'settings' }"
								@click="showTab('settings')"
							>
								Settings
							</button>
							<button
								class="button is-default"
								:class="{ selected: tab === 'playlists' }"
								@click="showTab('playlists')"
							>
								Playlists
							</button>
							<button
								v-if="
									station.type === 'community' &&
										station.partyMode
								"
								class="button is-default"
								:class="{ selected: tab === 'youtube' }"
								@click="showTab('youtube')"
							>
								YouTube
							</button>
						</div>
						<settings class="tab" v-show="tab === 'settings'" />
						<youtube-search
							v-if="
								station.type === 'community' &&
									station.partyMode
							"
							class="tab"
							v-show="tab === 'youtube'"
						/>
						<playlists class="tab" v-show="tab === 'playlists'" />
					</div>
				</div>
				<div class="right-section">
					<div class="section">
						<h4 class="section-title">Queue</h4>
						<hr class="section-horizontal-rule" />
						<queue />
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<button
				class="button is-primary tab-actionable-button"
				v-if="loggedIn && station.type === 'official'"
				@click="
					openModal({
						sector: 'station',
						modal: 'requestSong'
					})
				"
			>
				<i class="material-icons icon-with-button">queue</i>
				<span class="optional-desktop-only-text"> Request Song </span>
			</button>
			<div class="right">
				<confirm @confirm="clearAndRefillStationQueue()">
					<a class="button is-danger">
						Clear and refill station queue
					</a>
				</confirm>
				<confirm
					v-if="station && station.type === 'community'"
					@confirm="deleteStation()"
				>
					<button class="button is-danger">Delete station</button>
				</confirm>
			</div>
		</template>
	</modal>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";

import Toast from "toasters";
import TabQueryHandler from "@/mixins/TabQueryHandler.vue";

import Confirm from "@/components/Confirm.vue";
import Modal from "../../Modal.vue";

import Queue from "../../../pages/Station/Sidebar/Queue.vue";
import Settings from "./Tabs/Settings.vue";
import Playlists from "./Tabs/Playlists.vue";
import YoutubeSearch from "./Tabs/YoutubeSearch.vue";

export default {
	components: {
		Modal,
		Confirm,
		Queue,
		Settings,
		Playlists,
		YoutubeSearch
	},
	mixins: [TabQueryHandler],
	props: {
		stationId: { type: String, default: "" },
		sector: { type: String, default: "admin" }
	},
	data() {
		return {
			tab: "settings"
		};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn
		}),
		...mapState("modals/manageStation", {
			station: state => state.station,
			originalStation: state => state.originalStation
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch(`stations.getStationById`, this.stationId, res => {
			if (res.status === "success") {
				const { station } = res.data;
				this.editStation(station);

				this.socket.dispatch(
					"stations.getStationIncludedPlaylistsById",
					this.stationId,
					res => {
						if (res.status === "success") {
							this.setIncludedPlaylists(res.data.playlists);
						}
					}
				);

				this.socket.dispatch(
					"stations.getStationExcludedPlaylistsById",
					this.stationId,
					res => {
						if (res.status === "success") {
							this.setExcludedPlaylists(res.data.playlists);
						}
					}
				);
			} else {
				new Toast(`Station with that ID not found${this.stationId}`);
				this.closeModal({
					sector: this.sector,
					modal: "manageStation"
				});
			}
		});
	},
	beforeDestroy() {
		this.clearStation();
	},
	methods: {
		clearAndRefillStationQueue() {
			this.socket.dispatch(
				"stations.clearAndRefillStationQueue",
				this.station._id,
				res => {
					if (res.status !== "success")
						new Toast({
							content: `Error: ${res.message}`,
							timeout: 8000
						});
					else new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		...mapActions("modals/manageStation", [
			"editStation",
			"setIncludedPlaylists",
			"setExcludedPlaylists",
			"clearStation"
		]),
		...mapActions("modalVisibility", ["openModal", "closeModal"])
	}
};
</script>

<style lang="scss">
.manage-station-modal.modal {
	z-index: 1800;
	.modal-card {
		width: 1300px;
		overflow: auto;
		.tab > button {
			width: 100%;
			margin-bottom: 10px;
		}
	}
}
</style>

<style lang="scss" scoped>
.manage-station-modal.modal .modal-card-body .custom-modal-body {
	display: flex;
	flex-wrap: wrap;
	height: 100%;

	.section {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		width: auto;
		padding: 15px !important;
		margin: 0 10px;
	}

	.left-section {
		flex-basis: 50%;
		height: 100%;
		overflow-y: auto;
		flex-grow: 1;

		.tabs-container {
			.tab-selection {
				display: flex;

				.button {
					border-radius: 5px 5px 0 0;
					border: 0;
					text-transform: uppercase;
					font-size: 14px;
					color: var(--dark-grey-3);
					background-color: var(--light-grey-2);
					flex-grow: 1;
					height: 32px;

					&:not(:first-of-type) {
						margin-left: 5px;
					}
				}

				.selected {
					background-color: var(--dark-grey-3) !important;
					color: var(--white) !important;
				}
			}
			.tab {
				border: 1px solid var(--light-grey-3);
				padding: 15px;
				border-radius: 0 0 5px 5px;
			}
		}
	}
	.right-section {
		flex-basis: 50%;
		height: 100%;
		overflow-y: auto;
		flex-grow: 1;
	}
}

@media screen and (max-width: 1100px) {
	.manage-station-modal.modal .modal-card-body .custom-modal-body {
		.left-section,
		.right-section {
			flex-basis: unset;
			height: auto;
		}
	}
}
</style>
