<template>
	<div class="station-settings">
		<label class="label">Name</label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input class="input" type="text" v-model="station.name" />
			</p>
			<p class="control">
				<a class="button is-info" @click.prevent="updateName()">Save</a>
			</p>
		</div>
		<label class="label">Display Name</label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					v-model="station.displayName"
				/>
			</p>
			<p class="control">
				<a class="button is-info" @click.prevent="updateDisplayName()"
					>Save</a
				>
			</p>
		</div>
		<label class="label">Description</label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					v-model="station.description"
				/>
			</p>
			<p class="control">
				<a class="button is-info" @click.prevent="updateDescription()"
					>Save</a
				>
			</p>
		</div>

		<div class="settings-buttons">
			<div class="small-section">
				<label class="label">Theme</label>
				<div class="button-wrapper">
					<tippy
						theme="stationSettings"
						:interactive="true"
						:touch="true"
						placement="bottom"
						trigger="click"
						append-to="parent"
					>
						<button :class="station.theme">
							<i class="material-icons">palette</i>
							{{ station.theme }}
						</button>

						<template #content>
							<button
								class="blue"
								v-if="station.theme !== 'blue'"
								@click="updateTheme('blue')"
							>
								<i class="material-icons">palette</i>
								Blue
							</button>
							<button
								class="purple"
								v-if="station.theme !== 'purple'"
								@click="updateTheme('purple')"
							>
								<i class="material-icons">palette</i>
								Purple
							</button>
							<button
								class="teal"
								v-if="station.theme !== 'teal'"
								@click="updateTheme('teal')"
							>
								<i class="material-icons">palette</i>
								Teal
							</button>
							<button
								class="orange"
								v-if="station.theme !== 'orange'"
								@click="updateTheme('orange')"
							>
								<i class="material-icons">palette</i>
								Orange
							</button>
							<button
								class="red"
								v-if="station.theme !== 'red'"
								@click="updateTheme('red')"
							>
								<i class="material-icons">palette</i>
								Red
							</button>
						</template>
					</tippy>
				</div>
			</div>

			<div class="small-section">
				<label class="label">Privacy</label>
				<div class="button-wrapper">
					<tippy
						theme="stationSettings"
						:interactive="true"
						:touch="true"
						placement="bottom"
						trigger="click"
						append-to="parent"
					>
						<button :class="privacyButtons[station.privacy].style">
							<i class="material-icons">{{
								privacyButtons[station.privacy].iconName
							}}</i>
							{{ station.privacy }}
						</button>

						<template #content>
							<button
								class="green"
								v-if="station.privacy !== 'public'"
								@click="updatePrivacy('public')"
							>
								<i class="material-icons">{{
									privacyButtons["public"].iconName
								}}</i>
								Public
							</button>
							<button
								class="orange"
								v-if="station.privacy !== 'unlisted'"
								@click="updatePrivacy('unlisted')"
							>
								<i class="material-icons">{{
									privacyButtons["unlisted"].iconName
								}}</i>
								Unlisted
							</button>
							<button
								class="red"
								v-if="station.privacy !== 'private'"
								@click="updatePrivacy('private')"
							>
								<i class="material-icons">{{
									privacyButtons["private"].iconName
								}}</i>
								Private
							</button>
						</template>
					</tippy>
				</div>
			</div>

			<div class="small-section">
				<label class="label">Station Mode</label>
				<div class="button-wrapper" v-if="station.type === 'community'">
					<tippy
						theme="stationSettings"
						:interactive="true"
						:touch="true"
						placement="bottom"
						trigger="click"
						append-to="parent"
					>
						<button
							:class="{
								blue: !station.partyMode,
								yellow: station.partyMode
							}"
						>
							<i class="material-icons">{{
								station.partyMode
									? "emoji_people"
									: "playlist_play"
							}}</i>
							{{ station.partyMode ? "Party" : "Playlist" }}
						</button>

						<template #content>
							<button
								class="blue"
								v-if="station.partyMode"
								@click="updatePartyMode(false)"
							>
								<i class="material-icons">playlist_play</i>
								Playlist
							</button>
							<button
								class="yellow"
								v-if="!station.partyMode"
								@click="updatePartyMode(true)"
							>
								<i class="material-icons">emoji_people</i>
								Party
							</button>
						</template>
					</tippy>
				</div>
				<div v-else class="button-wrapper">
					<button
						class="blue"
						content="Can not be changed on official stations."
						v-tippy="{ theme: 'info' }"
					>
						<i class="material-icons">playlist_play</i>
						Playlist
					</button>
				</div>
			</div>

			<div v-if="!station.partyMode" class="small-section">
				<label class="label">Play Mode</label>
				<div class="button-wrapper" v-if="station.type === 'community'">
					<tippy
						theme="stationSettings"
						:interactive="true"
						:touch="true"
						placement="bottom"
						trigger="click"
						append-to="parent"
					>
						<button class="blue">
							<i class="material-icons">{{
								station.playMode === "random"
									? "shuffle"
									: "format_list_numbered"
							}}</i>
							{{
								station.playMode === "random"
									? "Random"
									: "Sequential"
							}}
						</button>

						<template #content>
							<button
								class="blue"
								v-if="station.playMode === 'sequential'"
								@click="updatePlayMode('random')"
							>
								<i class="material-icons">shuffle</i>
								Random
							</button>
							<button
								class="blue"
								v-if="station.playMode === 'random'"
								@click="updatePlayMode('sequential')"
							>
								<i class="material-icons"
									>format_list_numbered</i
								>
								Sequential
							</button>
						</template>
					</tippy>
				</div>
				<div v-else class="button-wrapper">
					<button
						class="blue"
						content="Can not be changed on official stations."
						v-tippy="{ theme: 'info' }"
					>
						<i class="material-icons">shuffle</i>
						Random
					</button>
				</div>
			</div>

			<div
				v-if="
					station.type === 'community' && station.partyMode === true
				"
				class="small-section"
			>
				<label class="label">Queue lock</label>
				<div class="button-wrapper">
					<tippy
						theme="stationSettings"
						:interactive="true"
						:touch="true"
						placement="bottom"
						trigger="click"
						append-to="parent"
					>
						<button
							:class="{
								green: station.locked,
								red: !station.locked
							}"
						>
							<i class="material-icons">{{
								station.locked ? "lock" : "lock_open"
							}}</i>
							{{ station.locked ? "Locked" : "Unlocked" }}
						</button>

						<template #content>
							<button
								class="green"
								v-if="!station.locked"
								@click="updateQueueLock(true)"
							>
								<i class="material-icons">lock</i>
								Locked
							</button>
							<button
								class="red"
								v-if="station.locked"
								@click="updateQueueLock(false)"
							>
								<i class="material-icons">lock_open</i>
								Unlocked
							</button>
						</template>
					</tippy>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters } from "vuex";

import Toast from "toasters";

import validation from "@/validation";

export default {
	data() {
		return {
			privacyButtons: {
				public: {
					style: "green",
					iconName: "public"
				},
				private: {
					style: "red",
					iconName: "lock"
				},
				unlisted: {
					style: "orange",
					iconName: "link"
				}
			}
		};
	},
	computed: {
		...mapState("modals/manageStation", {
			station: state => state.station,
			originalStation: state => state.originalStation
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		updateName() {
			if (this.originalStation.name !== this.station.name) {
				const { name } = this.station;
				if (!validation.isLength(name, 2, 16)) {
					new Toast("Name must have between 2 and 16 characters.");
				} else if (!validation.regex.az09_.test(name)) {
					new Toast(
						"Invalid name format. Allowed characters: a-z, 0-9 and _."
					);
				} else {
					this.socket.dispatch(
						"stations.updateName",
						this.station._id,
						name,
						res => {
							new Toast(res.message);

							if (res.status === "success") {
								this.station.name = name;
								this.originalStation.name = name;
							}
						}
					);
				}
			} else {
				new Toast("Please make a change before saving.");
			}
		},
		updateDisplayName() {
			if (this.originalStation.displayName !== this.station.displayName) {
				const { displayName } = this.station;
				if (!validation.isLength(displayName, 2, 32)) {
					new Toast(
						"Display name must have between 2 and 32 characters."
					);
				} else if (!validation.regex.ascii.test(displayName)) {
					new Toast(
						"Invalid display name format. Only ASCII characters are allowed."
					);
				} else {
					this.socket.dispatch(
						"stations.updateDisplayName",
						this.station._id,
						displayName,
						res => {
							new Toast(res.message);

							if (res.status === "success") {
								this.station.displayName = displayName;
								this.originalStation.displayName = displayName;
							}
						}
					);
				}
			} else {
				new Toast("Please make a change before saving.");
			}
		},
		updateDescription() {
			if (this.originalStation.description !== this.station.description) {
				const { description } = this.station;
				const characters = description
					.split("")
					.filter(character => character.charCodeAt(0) === 21328);
				if (!validation.isLength(description, 2, 200)) {
					new Toast(
						"Description must have between 2 and 200 characters."
					);
				} else if (characters.length !== 0) {
					new Toast("Invalid description format.");
				} else {
					this.socket.dispatch(
						"stations.updateDescription",
						this.station._id,
						description,
						res => {
							new Toast(res.message);

							if (res.status === "success") {
								this.station.description = description;
								this.originalStation.description = description;
							}
						}
					);
				}
			} else {
				new Toast("Please make a change before saving.");
			}
		},
		updateTheme(theme) {
			if (this.station.theme !== theme) {
				this.socket.dispatch(
					"stations.updateTheme",
					this.station._id,
					theme,
					res => {
						new Toast(res.message);

						if (res.status === "success") {
							this.station.theme = theme;
							this.originalStation.theme = theme;
						}
					}
				);
			}
		},
		updatePrivacy(privacy) {
			if (this.station.privacy !== privacy) {
				this.socket.dispatch(
					"stations.updatePrivacy",
					this.station._id,
					privacy,
					res => {
						new Toast(res.message);

						if (res.status === "success") {
							this.station.privacy = privacy;
							this.originalStation.privacy = privacy;
						}
					}
				);
			}
		},
		updatePartyMode(partyMode) {
			if (this.station.partyMode !== partyMode) {
				this.socket.dispatch(
					"stations.updatePartyMode",
					this.station._id,
					partyMode,
					res => {
						new Toast(res.message);

						if (res.status === "success") {
							this.station.partyMode = partyMode;
							this.originalStation.partyMode = partyMode;
						}
					}
				);
			}
		},
		updatePlayMode(playMode) {
			if (this.station.playMode !== playMode) {
				this.socket.dispatch(
					"stations.updatePlayMode",
					this.station._id,
					playMode,
					res => {
						new Toast(res.message);

						if (res.status === "success") {
							this.station.playMode = playMode;
							this.originalStation.playMode = playMode;
						}
					}
				);
			}
		},
		updateQueueLock(locked) {
			if (this.station.locked !== locked) {
				this.socket.dispatch(
					"stations.toggleLock",
					this.station._id,
					res => {
						if (res.status === "success") {
							if (this.originalStation) {
								this.station.locked = res.data.locked;
								this.originalStation.locked = res.data.locked;
							}

							new Toast(
								`Toggled queue lock successfully to ${res.data.locked}`
							);
						} else {
							new Toast("Failed to toggle queue lock.");
						}
					}
				);
			}
		}
	}
};
</script>

<style lang="less" scoped>
.station-settings {
	.settings-buttons {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		.small-section {
			width: calc(50% - 10px);
			min-width: 150px;
			margin: 5px auto;
		}
	}
	.button-wrapper {
		display: flex;
		flex-direction: column;

		/deep/ * .tippy-box[data-theme~="dropdown"] .tippy-content > span {
			max-width: 150px !important;
		}

		.tippy-content span button {
			width: 150px;
		}

		button {
			width: 100%;
			height: 36px;
			border: 0;
			border-radius: 3px;
			font-size: 18px;
			color: var(--white);
			box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.25);
			display: flex;
			text-align: center;
			justify-content: center;
			-ms-flex-align: center;
			align-items: center;
			-moz-user-select: none;
			user-select: none;
			cursor: pointer;
			padding: 0;
			text-transform: capitalize;

			&.red {
				background-color: var(--dark-red);
			}

			&.green {
				background-color: var(--green);
			}

			&.blue {
				background-color: var(--blue);
			}

			&.orange {
				background-color: var(--orange);
			}

			&.yellow {
				background-color: var(--yellow);
			}

			&.purple {
				background-color: var(--purple);
			}

			&.teal {
				background-color: var(--teal);
			}

			&.red {
				background-color: var(--dark-red);
			}

			i {
				font-size: 20px;
				margin-right: 4px;
			}
		}
	}
}
</style>
