<template>
	<div>
		<divage-metadata title="Admin | Songs | Import" />
		<div class="admin-tab import-tab">
			<h1>Import Songs</h1>
			<p>Import songs from YouTube playlists or channels</p>
			<hr class="section-horizontal-rule" />

			<div class="section-row">
				<div class="left-section">
					<div class="section">
						<h4>Start New Import</h4>
						<hr class="section-horizontal-rule" />

						<div v-if="createImport.stage === 1" class="stage">
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

							<label class="label"
								>Import Music Only<info-icon
									content="Only import videos from YouTube identified as music"
							/></label>
							<div class="control is-expanded select">
								<select
									v-model="createImport.isImportingOnlyMusic"
								>
									<option :value="false">false</option>
									<option :value="true">true</option>
								</select>
							</div>

							<div class="control is-grouped">
								<button
									class="control button is-danger"
									@click.prevent="prevCreateImport(2)"
								>
									<i class="material-icons"
										>navigate_before</i
									>
									Go Back
								</button>
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
				</div>
				<div class="right-section">
					<div class="section">
						<h4>Manage Imports</h4>
						<hr class="section-horizontal-rule" />
					</div>
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
				stage: 1,
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
				stage: 1,
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
				"songs.requestSet",
				this.createImport.youtubeUrl,
				this.createImport.isImportingOnlyMusic,
				true,
				res => {
					isImportingPlaylist = false;

					return new Toast({
						content: res.message,
						timeout: 20000
					});
				}
			);
		}
	}
};
</script>

<style lang="less" scoped>
.night-mode .admin-tab.import-tab {
	background-color: var(--dark-grey-3);

	p {
		color: var(--light-grey-2);
	}

	.left-section,
	.right-section {
		.section {
			background-color: var(--dark-grey-2) !important;
		}
	}
}

.admin-tab.import-tab {
	display: flex;
	flex-grow: 1;
	flex-direction: column;
	padding: 20px !important;
	border-radius: @border-radius;
	background-color: var(--white);
	color: var(--dark-grey);
	box-shadow: @box-shadow;

	h1 {
		font-size: 36px;
		margin: 0 0 5px 0;
	}

	hr {
		margin: 10px 0;
	}

	.section-row {
		display: flex;
		flex-wrap: wrap;
		height: 100%;

		.left-section,
		.right-section {
			max-height: 100%;
			overflow-y: auto;
			flex-grow: 1;

			.section {
				display: flex;
				flex-direction: column;
				flex-grow: 1;
				width: auto;
				margin: 5px;
				padding: 15px;
				border-radius: 5px;
				box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1),
					0 0 0 1px rgba(10, 10, 10, 0.1);

				h4 {
					font-size: 22px;
					margin: 0;
				}

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
						border-radius: 5px 0 0 5px;
					}

					&:last-child {
						border-radius: 0 5px 5px 0;
					}
				}
			}
		}

		.left-section {
			max-width: 600px;

			.section .import-started {
				font-size: 18px;
				font-weight: 600;
				margin-bottom: 10px;
			}
		}

		@media screen and (max-width: 1100px) {
			.left-section,
			.right-section {
				flex-basis: 100%;
				max-height: unset;
			}

			.left-section {
				max-width: unset;
				.section {
					margin-bottom: 10px;
				}
			}
		}
	}
}
</style>
