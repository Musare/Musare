<script setup lang="ts">
import { defineAsyncComponent, watch } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import validation from "@/validation";
import { useWebsocketsStore } from "@/stores/websockets";
import { useManageStationStore } from "@/stores/manageStation";
import { useForm } from "@/composables/useForm";
import { useConfigStore } from "@/stores/config";

const InfoIcon = defineAsyncComponent(
	() => import("@/components/InfoIcon.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true }
});

const { socket } = useWebsocketsStore();

const configStore = useConfigStore();
const { experimental } = storeToRefs(configStore);

const manageStationStore = useManageStationStore({
	modalUuid: props.modalUuid
});
const { station } = storeToRefs(manageStationStore);
const { editStation } = manageStationStore;

const { inputs, save, setOriginalValue } = useForm(
	{
		name: {
			value: station.value.name,
			validate: value => {
				if (!validation.isLength(value, 2, 16))
					return "Name must have between 2 and 16 characters.";
				if (!validation.regex.az09_.test(value))
					return "Invalid name format. Allowed characters: a-z, 0-9 and _.";
				return true;
			}
		},
		displayName: {
			value: station.value.displayName,
			validate: value => {
				if (!validation.isLength(value, 2, 32))
					return "Display name must have between 2 and 32 characters.";
				if (!validation.regex.ascii.test(value))
					return "Invalid display name format. Only ASCII characters are allowed.";
				return true;
			}
		},
		description: {
			value: station.value.description,
			validate: value => {
				if (
					value
						.split("")
						.filter(character => character.charCodeAt(0) === 21328)
						.length !== 0
				)
					return "Invalid description format.";
				return true;
			}
		},
		theme: station.value.theme,
		privacy: station.value.privacy,
		skipVoteThreshold: station.value.skipVoteThreshold,
		requestsEnabled: station.value.requests.enabled,
		requestsAccess: station.value.requests.access,
		requestsLimit: station.value.requests.limit,
		requestsAllowAutorequest: station.value.requests.allowAutorequest,
		requestsAutorequestLimit: {
			value: station.value.requests.autorequestLimit,
			validate: value => {
				if (value > station.value.requests.limit)
					return "The autorequest limit cannot be higher than the request limit.";
				return true;
			}
		},
		requestsAutorequestDisallowRecentlyPlayedEnabled:
			station.value.requests.autorequestDisallowRecentlyPlayedEnabled,
		requestsAutorequestDisallowRecentlyPlayedNumber:
			station.value.requests.autorequestDisallowRecentlyPlayedNumber,
		autofillEnabled: station.value.autofill.enabled,
		autofillLimit: station.value.autofill.limit,
		autofillMode: station.value.autofill.mode
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success") {
			const oldStation = JSON.parse(JSON.stringify(station.value));
			const updatedStation = {
				...oldStation,
				name: values.name,
				displayName: values.displayName,
				description: values.description,
				theme: values.theme,
				privacy: values.privacy,
				skipVoteThreshold: values.skipVoteThreshold,
				requests: {
					...oldStation.requests,
					enabled: values.requestsEnabled,
					access: values.requestsAccess,
					limit: values.requestsLimit,
					allowAutorequest: values.requestsAllowAutorequest,
					autorequestLimit: values.requestsAutorequestLimit,
					autorequestDisallowRecentlyPlayedEnabled:
						values.requestsAutorequestDisallowRecentlyPlayedEnabled,
					autorequestDisallowRecentlyPlayedNumber:
						values.requestsAutorequestDisallowRecentlyPlayedNumber
				},
				autofill: {
					...oldStation.autofill,
					enabled: values.autofillEnabled,
					limit: values.autofillLimit,
					mode: values.autofillMode
				}
			};
			socket.dispatch(
				"stations.update",
				station.value._id,
				updatedStation,
				res => {
					if (res.status === "success") {
						editStation(updatedStation);
						resolve();
					} else reject(new Error(res.message));
				}
			);
		} else {
			Object.values(messages).forEach(message => {
				new Toast({ content: message, timeout: 8000 });
			});
			resolve();
		}
	},
	{
		modalUuid: props.modalUuid
	}
);

watch(station, value => {
	setOriginalValue({
		name: value.name,
		displayName: value.displayName,
		description: value.description,
		theme: value.theme,
		privacy: value.privacy,
		skipVoteThreshold: value.skipVoteThreshold,
		requestsEnabled: value.requests.enabled,
		requestsAccess: value.requests.access,
		requestsLimit: value.requests.limit,
		requestsAllowAutorequest: value.requests.allowAutorequest,
		requestsAutorequestLimit: value.requests.autorequestLimit,
		requestsAutorequestDisallowRecentlyPlayedEnabled:
			value.requests.autorequestDisallowRecentlyPlayedEnabled,
		requestsAutorequestDisallowRecentlyPlayedNumber:
			value.requests.autorequestDisallowRecentlyPlayedNumber,
		autofillEnabled: value.autofill.enabled,
		autofillLimit: value.autofill.limit,
		autofillMode: value.autofill.mode
	});
});
</script>

<template>
	<div class="station-settings">
		<label class="label">Name</label>
		<div class="control is-expanded">
			<input class="input" type="text" v-model="inputs['name'].value" />
		</div>

		<label class="label">Display Name</label>
		<div class="control is-expanded">
			<input
				class="input"
				type="text"
				v-model="inputs['displayName'].value"
			/>
		</div>

		<label class="label">Description</label>
		<div class="control is-expanded">
			<input
				class="input"
				type="text"
				v-model="inputs['description'].value"
			/>
		</div>

		<div class="settings-buttons">
			<div class="small-section">
				<label class="label">Theme</label>
				<div class="control is-expanded select">
					<select v-model="inputs['theme'].value">
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
					<select v-model="inputs['privacy'].value">
						<option value="public">Public</option>
						<option value="unlisted">Unlisted</option>
						<option value="private" selected>Private</option>
					</select>
				</div>
			</div>

			<div class="small-section">
				<label class="label">
					Skip Vote Threshold
					<info-icon
						tooltip="The % of logged-in station users required to vote to skip a song"
					/>
				</label>
				<div class="control is-expanded input-slider">
					<input
						v-model="inputs['skipVoteThreshold'].value"
						type="range"
						min="0"
						max="100"
					/>
					<span>{{ inputs["skipVoteThreshold"].value }}%</span>
				</div>
			</div>

			<div
				class="requests-settings"
				:class="{ enabled: inputs['requestsEnabled'].value }"
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
								v-model="inputs['requestsEnabled'].value"
							/>
							<span class="slider round"></span>
						</label>

						<label for="toggle-requests">
							<p>
								{{
									inputs["requestsEnabled"].value
										? "Enabled"
										: "Disabled"
								}}
							</p>
						</label>
					</p>
				</div>

				<template v-if="inputs['requestsEnabled'].value">
					<div class="small-section">
						<label class="label">Minimum access</label>
						<div class="control is-expanded select">
							<select v-model="inputs['requestsAccess'].value">
								<option value="owner" selected>Owner</option>
								<option value="user">User</option>
							</select>
						</div>
					</div>

					<div class="small-section">
						<label class="label">Per user request limit</label>
						<div class="control is-expanded">
							<input
								class="input"
								type="number"
								min="1"
								max="50"
								v-model="inputs['requestsLimit'].value"
							/>
						</div>
					</div>

					<div class="small-section">
						<label class="label">Allow autorequest</label>
						<p class="is-expanded checkbox-control">
							<label class="switch">
								<input
									type="checkbox"
									v-model="
										inputs['requestsAllowAutorequest'].value
									"
								/>
								<span class="slider round"></span>
							</label>
						</p>
					</div>

					<template v-if="inputs['requestsAllowAutorequest'].value">
						<div class="small-section">
							<label class="label"
								>Per user autorequest limit</label
							>
							<div class="control is-expanded">
								<input
									class="input"
									type="number"
									min="1"
									:max="
										Math.min(
											50,
											inputs['requestsLimit'].value
										)
									"
									v-model="
										inputs['requestsAutorequestLimit'].value
									"
								/>
							</div>
						</div>

						<div
							class="small-section"
							v-if="experimental.station_history"
						>
							<label class="label"
								>Autorequest disallow recent</label
							>
							<p class="is-expanded checkbox-control">
								<label class="switch">
									<input
										type="checkbox"
										v-model="
											inputs[
												'requestsAutorequestDisallowRecentlyPlayedEnabled'
											].value
										"
									/>
									<span class="slider round"></span>
								</label>
							</p>
						</div>

						<div
							v-if="
								inputs[
									'requestsAutorequestDisallowRecentlyPlayedEnabled'
								].value && experimental.station_history
							"
							class="small-section"
						>
							<label class="label"
								>Autorequest disallow recent #</label
							>
							<div class="control is-expanded">
								<input
									class="input"
									type="number"
									min="1"
									max="250"
									v-model="
										inputs[
											'requestsAutorequestDisallowRecentlyPlayedNumber'
										].value
									"
								/>
							</div>
						</div>
					</template>
				</template>
			</div>

			<div
				class="autofill-settings"
				:class="{ enabled: inputs['autofillEnabled'].value }"
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
								v-model="inputs['autofillEnabled'].value"
							/>
							<span class="slider round"></span>
						</label>

						<label for="toggle-autofill">
							<p>
								{{
									inputs["autofillEnabled"].value
										? "Enabled"
										: "Disabled"
								}}
							</p>
						</label>
					</p>
				</div>

				<template v-if="inputs['autofillEnabled'].value">
					<div class="small-section">
						<label class="label">Song limit</label>
						<div class="control is-expanded">
							<input
								class="input"
								type="number"
								min="1"
								max="50"
								v-model="inputs['autofillLimit'].value"
							/>
						</div>
					</div>

					<div class="small-section">
						<label class="label">Play mode</label>
						<div class="control is-expanded select">
							<select v-model="inputs['autofillMode'].value">
								<option value="random" selected>Random</option>
								<option value="sequential">Sequential</option>
							</select>
						</div>
					</div>
				</template>
			</div>
		</div>

		<button class="control is-expanded button is-primary" @click="save()">
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

	.input-slider {
		display: flex;

		input[type="range"] {
			-webkit-appearance: none;
			margin: 0;
			padding: 0;
			width: 100%;
			min-width: 100px;
			background: transparent;
		}

		input[type="range"]:focus {
			outline: none;
		}

		input[type="range"]::-webkit-slider-runnable-track {
			width: 100%;
			height: 5.2px;
			cursor: pointer;
			box-shadow: 0;
			background: var(--light-grey-3);
			border-radius: @border-radius;
			border: 0;
		}

		input[type="range"]::-webkit-slider-thumb {
			box-shadow: 0;
			border: 0;
			height: 19px;
			width: 19px;
			border-radius: 100%;
			background: var(--primary-color);
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: -6.5px;
		}

		input[type="range"]::-moz-range-track {
			width: 100%;
			height: 5.2px;
			cursor: pointer;
			box-shadow: 0;
			background: var(--light-grey-3);
			border-radius: @border-radius;
			border: 0;
		}

		input[type="range"]::-moz-range-thumb {
			box-shadow: 0;
			border: 0;
			height: 19px;
			width: 19px;
			border-radius: 100%;
			background: var(--primary-color);
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: -6.5px;
		}
		input[type="range"]::-ms-track {
			width: 100%;
			height: 5.2px;
			cursor: pointer;
			box-shadow: 0;
			background: var(--light-grey-3);
			border-radius: @border-radius;
		}

		input[type="range"]::-ms-fill-lower {
			background: var(--light-grey-3);
			border: 0;
			border-radius: 0;
			box-shadow: 0;
		}

		input[type="range"]::-ms-fill-upper {
			background: var(--light-grey-3);
			border: 0;
			border-radius: 0;
			box-shadow: 0;
		}

		input[type="range"]::-ms-thumb {
			box-shadow: 0;
			border: 0;
			height: 15px;
			width: 15px;
			border-radius: 100%;
			background: var(--primary-color);
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: 1.5px;
		}

		& > span {
			min-width: 40px;
			margin-left: 10px;
			text-align: center;
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

		> .checkbox-control {
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

			.checkbox-control {
				justify-content: center;
			}
		}
	}
}
</style>
