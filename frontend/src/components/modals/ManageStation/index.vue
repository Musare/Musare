<template>
	<modal title="Manage Station" class="manage-station-modal">
		<template #body>
			<div class="custom-modal-body" v-if="station && station._id">
				<div class="left-section">
					<div class="section tabs-container">
						<h4 class="section-title">Manage Station</h4>
						<hr class="section-horizontal-rule" />
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
								v-if="station.type === 'community'"
								class="button is-default"
								:class="{ selected: tab === 'youtube' }"
								@click="showTab('youtube')"
							>
								YouTube
							</button>
						</div>
						<settings class="tab" v-show="tab === 'settings'" />
						<youtube-search
							v-if="station.type === 'community'"
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

import validation from "@/validation";
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
		...mapState("modals/editStation", {
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
		...mapActions("modals/editStation", ["editStation", "clearStation"]),
		...mapActions("modalVisibility", ["closeModal"])
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
		max-width: 600px;
		padding: 15px !important;
		margin: 0 10px;
	}

	.left-section {
		max-width: 50%;
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
		max-width: 50%;
		height: 100%;
		overflow-y: auto;
		flex-grow: 1;
	}
}
</style>
