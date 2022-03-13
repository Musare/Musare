<template>
	<div class="station-settings">
		<label class="label">Name</label>
		<div class="control is-expanded">
			<input class="input" type="text" v-model="local.name" />
		</div>

		<label class="label">Display Name</label>
		<div class="control is-expanded">
			<input class="input" type="text" v-model="local.displayName" />
		</div>

		<label class="label">Description</label>
		<div class="control is-expanded">
			<input class="input" type="text" v-model="local.description" />
		</div>

		<div class="settings-buttons">
			<div class="small-section">
				<label class="label">Theme</label>
				<div class="control is-expanded select">
					<select v-model="local.theme">
						<option value="blue" selected>Blue</option>
						<option value="purple">Purple</option>
						<option value="teal">Teal</option>
						<option value="orange">Orange</option>
						<option value="red">Red</option>
					</select>
				</div>
			</div>

			<div class="small-section">
				<label class="label">Privacy</label>
				<div class="control is-expanded select">
					<select v-model="local.privacy">
						<option value="public">Public</option>
						<option value="unlisted">Unlisted</option>
						<option value="private" selected>Private</option>
					</select>
				</div>
			</div>

			<hr class="section-horizontal-rule" />

			<div
				class="requests-settings"
				:class="{ enabled: local.requests.enabled }"
				style="
					display: flex;
					flex-wrap: wrap;
					width: 100%;
					margin: 5px 0;
				"
			>
				<div style="display: flex; width: 100%">
					<label class="label" style="display: flex; flex-grow: 1"
						>Requests</label
					>
					<p
						class="is-expanded checkbox-control"
						style="justify-content: end"
					>
						<label class="switch">
							<input
								type="checkbox"
								id="toggle-requests"
								v-model="local.requests.enabled"
							/>
							<span class="slider round"></span>
						</label>

						<label for="toggle-requests">
							<p>
								{{
									local.requests.enabled
										? "Disable"
										: "Enable"
								}}
							</p>
						</label>
					</p>
				</div>

				<div v-if="local.requests.enabled" class="control is-expanded">
					<label class="label">Minimum access</label>
					<div class="control is-expanded select">
						<select v-model="local.requests.access">
							<option value="owner" selected>Owner</option>
							<option value="user">User</option>
						</select>
					</div>
				</div>
			</div>

			<hr class="section-horizontal-rule" />

			<div
				class="autofill-settings"
				:class="{ enabled: local.autofill.enabled }"
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
								v-model="local.autofill.enabled"
							/>
							<span class="slider round"></span>
						</label>

						<label for="toggle-autofill">
							<p>
								{{
									local.autofill.enabled
										? "Disable"
										: "Enable"
								}}
							</p>
						</label>
					</p>
				</div>

				<div v-if="local.autofill.enabled" class="small-section">
					<label class="label">Song limit</label>
					<div class="control is-expanded">
						<input
							class="input"
							type="number"
							min="1"
							max="30"
							v-model="local.autofill.limit"
						/>
					</div>
				</div>

				<div v-if="local.autofill.enabled" class="small-section">
					<label class="label">Play mode</label>
					<div class="control is-expanded select">
						<select v-model="local.autofill.mode">
							<option value="random" selected>Random</option>
							<option value="sequential">Sequential</option>
						</select>
					</div>
				</div>
			</div>
		</div>

		<hr />

		<button class="control is-expanded button is-primary" @click="update()">
			Save Changes
		</button>
	</div>
</template>

<script>
import { mapState, mapGetters } from "vuex";

import Toast from "toasters";

import validation from "@/validation";

export default {
	data() {
		return {
			local: {
				name: "",
				displayName: "",
				description: "",
				theme: "blue",
				privacy: "private",
				requests: {
					enabled: true,
					access: "owner"
				},
				autofill: {
					enabled: true,
					limit: 30,
					mode: "random"
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
	mounted() {
		this.local = {
			...this.station,
			requests: {
				enabled: true,
				access: "owner"
			},
			autofill: {
				enabled: true,
				limit: 30,
				mode: this.station.playMode
			}
		};
	},
	methods: {
		update() {
			if (this.originalStation !== this.local) {
				const { name, displayName, description } = this.local;

				if (!validation.isLength(name, 2, 16))
					new Toast("Name must have between 2 and 16 characters.");
				else if (!validation.regex.az09_.test(name))
					new Toast(
						"Invalid name format. Allowed characters: a-z, 0-9 and _."
					);
				else if (!validation.isLength(displayName, 2, 32))
					new Toast(
						"Display name must have between 2 and 32 characters."
					);
				else if (!validation.regex.ascii.test(displayName))
					new Toast(
						"Invalid display name format. Only ASCII characters are allowed."
					);
				else if (!validation.isLength(description, 2, 200))
					new Toast(
						"Description must have between 2 and 200 characters."
					);
				else if (
					description
						.split("")
						.filter(character => character.charCodeAt(0) === 21328)
						.length !== 0
				)
					new Toast("Invalid description format.");
				else
					this.socket.dispatch(
						"stations.update",
						this.station._id,
						this.local,
						res => {
							new Toast(res.message);

							if (res.status === "success") {
								this.station = this.local;
								this.originalStation = this.local;
							}
						}
					);
			} else {
				new Toast("Please make a change before saving.");
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
