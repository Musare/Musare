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
						/></label>
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
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { mapGetters } from "vuex";

import Toast from "toasters";

export default {
	data() {
		return {
			createImport: {
				stage: 2,
				importMethod: "youtube",
				youtubeUrl:
					"https://www.youtube.com/playlist?list=PL3-sRm8xAzY9gpXTMGVHJWy_FMD67NBed",
				isImportingOnlyMusic: false
			}
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch("youtube.getRequestSetAdminLongJobs", {
			cb: res => {
				console.log(111, res);
			},
			onProgress: res => {
				console.log(222, res);
			}
		});
	},
	methods: {
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
		}
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
			max-width: 600px;
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

		@media screen and (max-width: 1100px) {
			.card {
				flex-basis: 100%;
				max-height: unset;

				&.left-section {
					max-width: unset;
					margin-right: 0 !important;
					margin-bottom: 10px !important;
				}
			}
		}
	}
}
</style>
