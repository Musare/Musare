<template>
	<div>
		<page-metadata title="Admin | Songs | Import" />
		<div class="admin-tab import-tab">
			<div class="card">
				<h1>Import Songs</h1>
				<p>Import songs from YouTube playlists or channels</p>
			</div>

			<div class="section-row">
				<div class="card left-section">
					<h4>Start New Import</h4>
					<hr class="section-horizontal-rule" />

					<div v-if="false && createImport.stage === 1" class="stage">
						<label class="label">Import Method</label>
						<div class="control is-expanded select">
							<select v-model="createImport.importMethod">
								<option value="youtube">YouTube</option>
							</select>
						</div>

						<div class="control is-expanded">
							<button
								class="button is-primary"
								@click.prevent="submitCreateImport(1)"
							>
								<i class="material-icons">navigate_next</i>
								Next
							</button>
						</div>
					</div>

					<div
						v-else-if="
							createImport.stage === 2 &&
							createImport.importMethod === 'youtube'
						"
						class="stage"
					>
						<label class="label"
							>YouTube URL
							<info-icon
								content="YouTube playlist or channel URLs may be provided"
							/>
						</label>
						<div class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="YouTube Playlist or Channel URL"
								v-model="createImport.youtubeUrl"
							/>
						</div>

						<div class="control is-expanded checkbox-control">
							<label class="switch">
								<input
									type="checkbox"
									id="import-music-only"
									v-model="createImport.isImportingOnlyMusic"
								/>
								<span class="slider round"></span>
							</label>

							<label class="label" for="import-music-only">
								Import Music Only
								<info-icon
									content="Only import videos from YouTube identified as music"
									@click.prevent
								/>
							</label>
						</div>

						<div class="control is-expanded">
							<button
								class="control is-expanded button is-primary"
								@click.prevent="submitCreateImport(2)"
							>
								<i class="material-icons icon-with-button"
									>publish</i
								>
								Import
							</button>
						</div>
					</div>

					<div v-if="createImport.stage === 3" class="stage">
						<p class="has-text-centered import-started">
							Import Started
						</p>

						<div class="control is-expanded">
							<button
								class="button is-info"
								@click.prevent="submitCreateImport(3)"
							>
								<i class="material-icons icon-with-button"
									>restart_alt</i
								>
								Start Again
							</button>
						</div>
					</div>
				</div>
				<div class="card right-section">
					<h4>Manage Imports</h4>
					<hr class="section-horizontal-rule" />
					<advanced-table
						:column-default="columnDefault"
						:columns="columns"
						:filters="filters"
						:events="events"
						data-action="media.getImportJobs"
						name="admin-songs-import"
						:max-width="1060"
					>
						<template #column-options="slotProps">
							<div class="row-options">
								<button
									class="button is-primary icon-with-button material-icons"
									@click="openAdvancedTable(slotProps.item)"
									:disabled="
										slotProps.item.removed ||
										slotProps.item.status !== 'success'
									"
									content="Manage imported videos"
									v-tippy
								>
									table_view
								</button>
								<button
									class="button is-primary icon-with-button material-icons"
									@click="
										editSongs(
											slotProps.item.response
												.successfulVideoIds
										)
									"
									:disabled="
										slotProps.item.removed ||
										slotProps.item.status !== 'success'
									"
									content="Create/edit song from videos"
									v-tippy
								>
									music_note
								</button>
								<button
									class="button is-danger icon-with-button material-icons"
									@click.prevent="
										confirmAction({
											message:
												'Note: Removing an import will not remove any videos or songs.',
											action: 'removeImportJob',
											params: slotProps.item
										})
									"
									:disabled="
										slotProps.item.removed ||
										slotProps.item.status === 'in-progress'
									"
									content="Remove Import"
									v-tippy
								>
									delete_forever
								</button>
							</div>
						</template>
						<template #column-type="slotProps">
							<span :title="slotProps.item.type">{{
								slotProps.item.type
							}}</span>
						</template>
						<template #column-requestedBy="slotProps">
							<user-link :user-id="slotProps.item.requestedBy" />
						</template>
						<template #column-requestedAt="slotProps">
							<span
								:title="new Date(slotProps.item.requestedAt)"
								>{{
									getDateFormatted(slotProps.item.requestedAt)
								}}</span
							>
						</template>
						<template #column-successful="slotProps">
							<span :title="slotProps.item.response.successful">{{
								slotProps.item.response.successful
							}}</span>
						</template>
						<template #column-alreadyInDatabase="slotProps">
							<span
								:title="
									slotProps.item.response.alreadyInDatabase
								"
								>{{
									slotProps.item.response.alreadyInDatabase
								}}</span
							>
						</template>
						<template #column-failed="slotProps">
							<span :title="slotProps.item.response.failed">{{
								slotProps.item.response.failed
							}}</span>
						</template>
						<template #column-status="slotProps">
							<span :title="slotProps.item.status">{{
								slotProps.item.status
							}}</span>
						</template>
						<template #column-url="slotProps">
							<a
								:href="slotProps.item.query.url"
								target="_blank"
								>{{ slotProps.item.query.url }}</a
							>
						</template>
						<template #column-musicOnly="slotProps">
							<span :title="slotProps.item.query.musicOnly">{{
								slotProps.item.query.musicOnly
							}}</span>
						</template>
						<template #column-_id="slotProps">
							<span :title="slotProps.item._id">{{
								slotProps.item._id
							}}</span>
						</template>
					</advanced-table>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";

import Toast from "toasters";

import AdvancedTable from "@/components/AdvancedTable.vue";

export default {
	components: {
		AdvancedTable
	},
	data() {
		return {
			createImport: {
				stage: 2,
				importMethod: "youtube",
				youtubeUrl:
					"https://www.youtube.com/playlist?list=PL3-sRm8xAzY9gpXTMGVHJWy_FMD67NBed",
				isImportingOnlyMusic: false
			},
			columnDefault: {
				sortable: true,
				hidable: true,
				defaultVisibility: "shown",
				draggable: true,
				resizable: true,
				minWidth: 200,
				maxWidth: 600
			},
			columns: [
				{
					name: "options",
					displayName: "Options",
					properties: ["_id", "status"],
					sortable: false,
					hidable: false,
					resizable: false,
					minWidth: 129,
					defaultWidth: 129
				},
				{
					name: "type",
					displayName: "Type",
					properties: ["type"],
					sortProperty: "type",
					minWidth: 120,
					defaultWidth: 120
				},
				{
					name: "requestedBy",
					displayName: "Requested By",
					properties: ["requestedBy"],
					sortProperty: "requestedBy"
				},
				{
					name: "requestedAt",
					displayName: "Requested At",
					properties: ["requestedAt"],
					sortProperty: "requestedAt"
				},
				{
					name: "successful",
					displayName: "Successful",
					properties: ["response"],
					sortProperty: "response.successful",
					minWidth: 120,
					defaultWidth: 120
				},
				{
					name: "alreadyInDatabase",
					displayName: "Existing",
					properties: ["response"],
					sortProperty: "response.alreadyInDatabase",
					minWidth: 120,
					defaultWidth: 120
				},
				{
					name: "failed",
					displayName: "Failed",
					properties: ["response"],
					sortProperty: "response.failed",
					minWidth: 120,
					defaultWidth: 120
				},
				{
					name: "status",
					displayName: "Status",
					properties: ["status"],
					sortProperty: "status",
					defaultVisibility: "hidden"
				},
				{
					name: "url",
					displayName: "URL",
					properties: ["query.url"],
					sortProperty: "query.url"
				},
				{
					name: "musicOnly",
					displayName: "Music Only",
					properties: ["query.musicOnly"],
					sortProperty: "query.musicOnly",
					minWidth: 120,
					defaultWidth: 120
				},
				{
					name: "_id",
					displayName: "Import ID",
					properties: ["_id"],
					sortProperty: "_id",
					minWidth: 215,
					defaultWidth: 215,
					defaultVisibility: "hidden"
				}
			],
			filters: [
				{
					name: "_id",
					displayName: "Import ID",
					property: "_id",
					filterTypes: ["exact"],
					defaultFilterType: "exact"
				},
				{
					name: "type",
					displayName: "Type",
					property: "type",
					filterTypes: ["exact"],
					defaultFilterType: "exact",
					dropdown: [["youtube", "YouTube"]]
				},
				{
					name: "requestedBy",
					displayName: "Requested By",
					property: "requestedBy",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "requestedAt",
					displayName: "Requested At",
					property: "requestedAt",
					filterTypes: ["datetimeBefore", "datetimeAfter"],
					defaultFilterType: "datetimeBefore"
				},
				{
					name: "response.successful",
					displayName: "Successful",
					property: "response.successful",
					filterTypes: [
						"numberLesserEqual",
						"numberLesser",
						"numberGreater",
						"numberGreaterEqual",
						"numberEquals"
					],
					defaultFilterType: "numberLesser"
				},
				{
					name: "response.alreadyInDatabase",
					displayName: "Existing",
					property: "response.alreadyInDatabase",
					filterTypes: [
						"numberLesserEqual",
						"numberLesser",
						"numberGreater",
						"numberGreaterEqual",
						"numberEquals"
					],
					defaultFilterType: "numberLesser"
				},
				{
					name: "response.failed",
					displayName: "Failed",
					property: "response.failed",
					filterTypes: [
						"numberLesserEqual",
						"numberLesser",
						"numberGreater",
						"numberGreaterEqual",
						"numberEquals"
					],
					defaultFilterType: "numberLesser"
				},
				{
					name: "status",
					displayName: "Status",
					property: "status",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "url",
					displayName: "URL",
					property: "query.url",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "musicOnly",
					displayName: "Music Only",
					property: "query.musicOnly",
					filterTypes: ["exact"],
					defaultFilterType: "exact",
					dropdown: [
						[true, "True"],
						[false, "False"]
					]
				},
				{
					name: "status",
					displayName: "Status",
					property: "status",
					filterTypes: ["exact"],
					defaultFilterType: "exact",
					dropdown: [
						["success", "Success"],
						["in-progress", "In Progress"],
						["failed", "Failed"]
					]
				}
			]
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		// this.socket.dispatch("youtube.getRequestSetAdminLongJobs", {
		// 	cb: res => {
		// 		console.log(111, res);
		// 	},
		// 	onProgress: res => {
		// 		console.log(222, res);
		// 	}
		// });
	},
	methods: {
		openAdvancedTable(importJob) {
			const filter = {
				appliedFilters: [
					{
						data: importJob._id,
						filter: {
							name: "importJob",
							displayName: "Import%20job",
							property: "importJob",
							filterTypes: ["special"],
							defaultFilterType: "special"
						},
						filterType: { name: "special", displayName: "Special" }
					}
				],
				appliedFilterOperator: "or"
			};
			this.$router.push({
				path: `/admin/youtube/videos`,
				query: { filter: JSON.stringify(filter) }
			});
		},
		submitCreateImport(stage) {
			if (stage === 2) {
				const playlistRegex = /[\\?&]list=([^&#]*)/;
				const channelRegex =
					/\.[\w]+\/(?:(?:channel\/(UC[0-9A-Za-z_-]{21}[AQgw]))|(?:user\/?([\w-]+))|(?:c\/?([\w-]+))|(?:\/?([\w-]+)))/;
				if (
					playlistRegex.exec(this.createImport.youtubeUrl) ||
					channelRegex.exec(this.createImport.youtubeUrl)
				)
					this.importFromYoutube();
				else
					return new Toast({
						content: "Please enter a valid YouTube URL.",
						timeout: 4000
					});
			}

			if (stage === 3) this.resetCreateImport();
			else this.createImport.stage += 1;

			return this.createImport.stage;
		},
		resetCreateImport() {
			this.createImport = {
				stage: 2,
				importMethod: "youtube",
				youtubeUrl:
					"https://www.youtube.com/channel/UCio_FVgKVgqcHrRiXDpnqbw",
				isImportingOnlyMusic: false
			};
		},
		prevCreateImport(stage) {
			if (stage === 2) this.createImport.stage = 1;
		},
		importFromYoutube() {
			let isImportingPlaylist = true;

			if (!this.createImport.youtubeUrl)
				return new Toast("Please enter a YouTube URL.");

			// don't give starting import message instantly in case of instant error
			setTimeout(() => {
				if (isImportingPlaylist) {
					new Toast(
						"Starting to import your playlist. This can take some time to do."
					);
				}
			}, 750);

			return this.socket.dispatch(
				"youtube.requestSetAdmin",
				this.createImport.youtubeUrl,
				this.createImport.isImportingOnlyMusic,
				true,
				{
					cb: res => {
						isImportingPlaylist = false;

						return new Toast({
							content: res.message,
							timeout: 20000
						});
					},
					onProgress: console.log
				}
			);
		},
		getDateFormatted(createdAt) {
			const date = new Date(createdAt);
			const year = date.getFullYear();
			const month = `${date.getMonth() + 1}`.padStart(2, 0);
			const day = `${date.getDate()}`.padStart(2, 0);
			const hour = `${date.getHours()}`.padStart(2, 0);
			const minute = `${date.getMinutes()}`.padStart(2, 0);
			return `${year}-${month}-${day} ${hour}:${minute}`;
		},
		editSongs(videos) {
			const songs = videos.map(youtubeId => ({ youtubeId }));
			if (songs.length === 1)
				this.openModal({ modal: "editSong", data: { song: songs[0] } });
			else this.openModal({ modal: "editSongs", data: { songs } });
		},
		confirmAction({ message, action, params }) {
			this.openModal({
				modal: "confirm",
				data: {
					message,
					action,
					params,
					onCompleted: this.handleConfirmed
				}
			});
		},
		handleConfirmed({ action, params }) {
			if (typeof this[action] === "function") {
				if (params) this[action](params);
				else this[action]();
			}
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="less" scoped>
.admin-tab.import-tab {
	.section-row {
		display: flex;
		flex-wrap: wrap;
		height: 100%;

		.card {
			max-height: 100%;
			overflow-y: auto;
			flex-grow: 1;

			.control.is-expanded {
				.button {
					width: 100%;
				}

				&:not(:last-of-type) {
					margin-bottom: 10px !important;
				}

				&:last-of-type {
					margin-bottom: 0 !important;
				}
			}

			.control.is-grouped > .button {
				&:not(:last-child) {
					border-radius: @border-radius 0 0 @border-radius;
				}

				&:last-child {
					border-radius: 0 @border-radius @border-radius 0;
				}
			}
		}

		.left-section {
			height: 100%;
			max-width: 400px;
			margin-right: 20px !important;

			.checkbox-control label.label {
				margin-left: 10px;
			}

			.import-started {
				font-size: 18px;
				font-weight: 600;
				margin-bottom: 10px;
			}
		}

		.right-section {
			max-width: calc(100% - 400px);
		}

		@media screen and (max-width: 1200px) {
			.card {
				flex-basis: 100%;
				max-height: unset;

				&.left-section {
					max-width: unset;
					margin-right: 0 !important;
					margin-bottom: 10px !important;
				}

				&.right-section {
					max-width: unset;
				}
			}
		}
	}
}
</style>
