<script setup lang="ts">
import { useStore } from "vuex";
import { ref, computed, onMounted } from "vue";
import Toast from "toasters";
import { useModalState, useModalActions } from "@/vuex_helpers";
import validation from "@/validation";

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const store = useStore();

const { socket } = store.state.websockets;

const modalState = useModalState("modals/manageStation/MODAL_UUID", {
	modalUuid: props.modalUuid
});
const station = computed(() => modalState.station);

const { editStation } = useModalActions(
	"modals/manageStation/MODAL_UUID",
	["editStation"],
	{
		modalUuid: props.modalUuid
	}
);

const localStation = ref({
	name: "",
	displayName: "",
	description: "",
	theme: "blue",
	privacy: "private",
	requests: {
		enabled: true,
		access: "owner",
		limit: 3
	},
	autofill: {
		enabled: true,
		limit: 30,
		mode: "random"
	}
});

const update = () => {
	if (
		JSON.stringify({
			name: localStation.value.name,
			displayName: localStation.value.displayName,
			description: localStation.value.description,
			theme: localStation.value.theme,
			privacy: localStation.value.privacy,
			requests: {
				enabled: localStation.value.requests.enabled,
				access: localStation.value.requests.access,
				limit: localStation.value.requests.limit
			},
			autofill: {
				enabled: localStation.value.autofill.enabled,
				limit: localStation.value.autofill.limit,
				mode: localStation.value.autofill.mode
			}
		}) !==
		JSON.stringify({
			name: station.value.name,
			displayName: station.value.displayName,
			description: station.value.description,
			theme: station.value.theme,
			privacy: station.value.privacy,
			requests: {
				enabled: station.value.requests.enabled,
				access: station.value.requests.access,
				limit: station.value.requests.limit
			},
			autofill: {
				enabled: station.value.autofill.enabled,
				limit: station.value.autofill.limit,
				mode: station.value.autofill.mode
			}
		})
	) {
		const { name, displayName, description } = localStation.value;

		if (!validation.isLength(name, 2, 16))
			new Toast("Name must have between 2 and 16 characters.");
		else if (!validation.regex.az09_.test(name))
			new Toast(
				"Invalid name format. Allowed characters: a-z, 0-9 and _."
			);
		else if (!validation.isLength(displayName, 2, 32))
			new Toast("Display name must have between 2 and 32 characters.");
		else if (!validation.regex.ascii.test(displayName))
			new Toast(
				"Invalid display name format. Only ASCII characters are allowed."
			);
		else if (!validation.isLength(description, 2, 200))
			new Toast("Description must have between 2 and 200 characters.");
		else if (
			description
				.split("")
				.filter(character => character.charCodeAt(0) === 21328)
				.length !== 0
		)
			new Toast("Invalid description format.");
		else
			socket.dispatch(
				"stations.update",
				station.value._id,
				localStation.value,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						editStation(localStation.value);
					}
				}
			);
	} else {
		new Toast("Please make a change before saving.");
	}
};

onMounted(() => {
	localStation.value = JSON.parse(JSON.stringify(station.value));
});
</script>

<template>
	<div class="station-settings">
		<label class="label">Name</label>
		<div class="control is-expanded">
			<input class="input" type="text" v-model="localStation.name" />
		</div>

		<label class="label">Display Name</label>
		<div class="control is-expanded">
			<input
				class="input"
				type="text"
				v-model="localStation.displayName"
			/>
		</div>

		<label class="label">Description</label>
		<div class="control is-expanded">
			<input
				class="input"
				type="text"
				v-model="localStation.description"
			/>
		</div>

		<div class="settings-buttons">
			<div class="small-section">
				<label class="label">Theme</label>
				<div class="control is-expanded select">
					<select v-model="localStation.theme">
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
					<select v-model="localStation.privacy">
						<option value="public">Public</option>
						<option value="unlisted">Unlisted</option>
						<option value="private" selected>Private</option>
					</select>
				</div>
			</div>

			<div
				v-if="localStation.requests"
				class="requests-settings"
				:class="{ enabled: localStation.requests.enabled }"
			>
				<div class="toggle-row">
					<label class="label">
						Requests
						<info-icon
							tooltip="Allow users to add songs to the queue"
						/>
					</label>
					<p class="is-expanded checkbox-control">
						<label class="switch">
							<input
								type="checkbox"
								id="toggle-requests"
								v-model="localStation.requests.enabled"
							/>
							<span class="slider round"></span>
						</label>

						<label for="toggle-requests">
							<p>
								{{
									localStation.requests.enabled
										? "Enabled"
										: "Disabled"
								}}
							</p>
						</label>
					</p>
				</div>

				<div v-if="localStation.requests.enabled" class="small-section">
					<label class="label">Minimum access</label>
					<div class="control is-expanded select">
						<select v-model="localStation.requests.access">
							<option value="owner" selected>Owner</option>
							<option value="user">User</option>
						</select>
					</div>
				</div>

				<div v-if="localStation.requests.enabled" class="small-section">
					<label class="label">Per user request limit</label>
					<div class="control is-expanded">
						<input
							class="input"
							type="number"
							min="1"
							max="50"
							v-model="localStation.requests.limit"
						/>
					</div>
				</div>
			</div>

			<div
				v-if="localStation.autofill"
				class="autofill-settings"
				:class="{ enabled: localStation.autofill.enabled }"
			>
				<div class="toggle-row">
					<label class="label">
						Autofill
						<info-icon
							tooltip="Automatically fill the queue with songs"
						/>
					</label>
					<p class="is-expanded checkbox-control">
						<label class="switch">
							<input
								type="checkbox"
								id="toggle-autofill"
								v-model="localStation.autofill.enabled"
							/>
							<span class="slider round"></span>
						</label>

						<label for="toggle-autofill">
							<p>
								{{
									localStation.autofill.enabled
										? "Enabled"
										: "Disabled"
								}}
							</p>
						</label>
					</p>
				</div>

				<div v-if="localStation.autofill.enabled" class="small-section">
					<label class="label">Song limit</label>
					<div class="control is-expanded">
						<input
							class="input"
							type="number"
							min="1"
							max="50"
							v-model="localStation.autofill.limit"
						/>
					</div>
				</div>

				<div v-if="localStation.autofill.enabled" class="small-section">
					<label class="label">Play mode</label>
					<div class="control is-expanded select">
						<select v-model="localStation.autofill.mode">
							<option value="random" selected>Random</option>
							<option value="sequential">Sequential</option>
						</select>
					</div>
				</div>
			</div>
		</div>

		<button class="control is-expanded button is-primary" @click="update()">
			Save Changes
		</button>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.requests-settings,
	.autofill-settings {
		background-color: var(--dark-grey-2) !important;
	}
}

.station-settings {
	.settings-buttons {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;

		.small-section {
			width: calc(50% - 10px);
			min-width: 150px;
			margin: 5px auto;

			&:nth-child(odd) {
				margin-left: 0;
			}
			&:nth-child(even) {
				margin-right: 0;
			}
		}
	}

	.requests-settings,
	.autofill-settings {
		display: flex;
		flex-wrap: wrap;
		width: 100%;
		margin: 10px 0;
		padding: 10px;
		border-radius: @border-radius;
		box-shadow: @box-shadow;

		.toggle-row {
			display: flex;
			width: 100%;
			line-height: 36px;

			.label {
				font-size: 18px;
				margin: 0;
			}
		}

		.label {
			display: flex;
			flex-grow: 1;
		}

		.checkbox-control {
			justify-content: end;
		}

		.small-section {
			&:nth-child(even) {
				margin-left: 0;
				margin-right: auto;
			}
			&:nth-child(odd) {
				margin-left: auto;
				margin-right: 0;
			}
		}
	}
}
</style>
