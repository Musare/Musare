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
				<div class="control is-grouped input-with-button">
					<p class="control is-expanded select">
						<select v-model="station.theme">
							<option value="blue" selected>Blue</option>
							<option value="purple">Purple</option>
							<option value="teal">Teal</option>
							<option value="orange">Orange</option>
							<option value="red">Red</option>
						</select>
					</p>
					<p class="control">
						<a class="button is-info" @click.prevent="updateTheme()"
							>Save</a
						>
					</p>
				</div>
			</div>

			<div class="small-section">
				<label class="label">Privacy</label>
				<div class="control is-grouped input-with-button">
					<p class="control is-expanded select">
						<select v-model="station.privacy">
							<option value="public">Public</option>
							<option value="unlisted">Unlisted</option>
							<option value="private" selected>Private</option>
						</select>
					</p>
					<p class="control">
						<a
							class="button is-info"
							@click.prevent="updatePrivacy()"
							>Save</a
						>
					</p>
				</div>
			</div>

			<hr class="section-horizontal-rule" />

			<div
				class="queue-settings"
				:class="{ enabled: queue.enabled }"
				style="
					display: flex;
					flex-wrap: wrap;
					width: 100%;
					margin: 5px 0;
				"
			>
				<div style="display: flex; width: 100%">
					<label class="label" style="display: flex; flex-grow: 1"
						>Queue requests</label
					>
					<p
						class="is-expanded checkbox-control"
						style="justify-content: end"
					>
						<label class="switch">
							<input
								type="checkbox"
								id="toggle-queue"
								v-model="queue.enabled"
							/>
							<span class="slider round"></span>
						</label>

						<label for="toggle-queue">
							<p>
								{{ queue.enabled ? "Disable" : "Enable" }}
							</p>
						</label>
					</p>
				</div>

				<div v-if="queue.enabled" class="small-section">
					<label class="label">Minimum access</label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded select">
							<select v-model="queue.access">
								<option value="owner" selected>Owner</option>
								<option value="user">User</option>
							</select>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click.prevent="updateQueuePrivacy()"
								>Save</a
							>
						</p>
					</div>
				</div>

				<div v-if="queue.enabled" class="small-section">
					<label class="label">Lock</label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded select">
							<select v-model="station.locked">
								<option value="true">Locked</option>
								<option value="false" selected>Unlocked</option>
							</select>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click.prevent="updateQueueLock()"
								>Save</a
							>
						</p>
					</div>
				</div>
			</div>

			<hr class="section-horizontal-rule" />

			<div
				class="autofill-settings"
				:class="{ enabled: autofill.enabled }"
				style="
					display: flex;
					flex-wrap: wrap;
					width: 100%;
					margin: 5px 0;
				"
			>
				<div style="display: flex; width: 100%">
					<label class="label" style="display: flex; flex-grow: 1"
						>Autofill</label
					>
					<p
						class="is-expanded checkbox-control"
						style="justify-content: end"
					>
						<label class="switch">
							<input
								type="checkbox"
								id="toggle-autofill"
								v-model="autofill.enabled"
							/>
							<span class="slider round"></span>
						</label>

						<label for="toggle-autofill">
							<p>
								{{ autofill.enabled ? "Disable" : "Enable" }}
							</p>
						</label>
					</p>
				</div>

				<div v-if="autofill.enabled" class="small-section">
					<label class="label">Song limit</label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="number"
								min="1"
								max="30"
								v-model="autofill.limit"
							/>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click.prevent="updateAutofillLimit()"
								>Save</a
							>
						</p>
					</div>
				</div>

				<div v-if="autofill.enabled" class="small-section">
					<label class="label">Play mode</label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded select">
							<select v-model="station.playMode">
								<option value="random" selected>Random</option>
								<option value="sequential">Sequential</option>
							</select>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click.prevent="updatePlayMode()"
								>Save</a
							>
						</p>
					</div>
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
			},
			autofill: {
				enabled: true,
				limit: 30
			},
			queue: {
				enabled: true,
				access: "owner"
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
		updateTheme() {
			if (this.station.theme !== this.originalStation.theme) {
				this.socket.dispatch(
					"stations.updateTheme",
					this.station._id,
					this.station.theme,
					res => {
						new Toast(res.message);

						if (res.status === "success") {
							this.originalStation.theme = this.station.theme;
						}
					}
				);
			}
		},
		updatePrivacy() {
			if (this.station.privacy !== this.originalStation.privacy) {
				this.socket.dispatch(
					"stations.updatePrivacy",
					this.station._id,
					this.station.privacy,
					res => {
						new Toast(res.message);

						if (res.status === "success") {
							this.originalStation.privacy = this.station.privacy;
						}
					}
				);
			}
		},
		updatePlayMode() {
			if (this.station.playMode !== this.originalStation.playMode) {
				this.socket.dispatch(
					"stations.updatePlayMode",
					this.station._id,
					this.station.playMode,
					res => {
						new Toast(res.message);

						if (res.status === "success") {
							this.originalStation.playMode =
								this.station.playMode;
						}
					}
				);
			}
		},
		updateQueueLock() {
			if (this.station.locked !== this.originalStation.locked) {
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
		},
		updateAutofillLimit() {},
		updateQueuePrivacy() {}
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

		.section-horizontal-rule {
			width: 100%;
		}
	}
	.button-wrapper {
		display: flex;
		flex-direction: column;

		:deep(* .tippy-box[data-theme~="dropdown"] .tippy-content > span) {
			max-width: 150px !important;
		}

		.tippy-content span button {
			width: 150px;
		}

		button {
			width: 100%;
			height: 36px;
			border: 0;
			border-radius: @border-radius;
			font-size: 18px;
			color: var(--white);
			box-shadow: @box-shadow;
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
