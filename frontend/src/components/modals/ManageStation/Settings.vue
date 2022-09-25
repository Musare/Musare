<script setup lang="ts">
import { defineAsyncComponent, watch } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import validation from "@/validation";
import { useWebsocketsStore } from "@/stores/websockets";
import { useManageStationStore } from "@/stores/manageStation";
import { useForm } from "@/composables/useForm";

const InfoIcon = defineAsyncComponent(
	() => import("@/components/InfoIcon.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true }
});

const { socket } = useWebsocketsStore();

const manageStationStore = useManageStationStore(props);
const { station } = storeToRefs(manageStationStore);
const { editStation } = manageStationStore;

const { inputs, save, setOriginalValue } = useForm(
	{
		name: {
			value: station.value.name,
			validate: value => {
				if (!validation.isLength(value, 2, 16)) {
					const err = "Name must have between 2 and 16 characters.";
					new Toast(err);
					return err;
				}
				if (!validation.regex.az09_.test(value)) {
					const err =
						"Invalid name format. Allowed characters: a-z, 0-9 and _.";
					new Toast(err);
					return err;
				}
				return true;
			}
		},
		displayName: {
			value: station.value.displayName,
			validate: value => {
				if (!validation.isLength(value, 2, 32)) {
					const err =
						"Display name must have between 2 and 32 characters.";
					new Toast(err);
					return err;
				}
				if (!validation.regex.ascii.test(value)) {
					const err =
						"Invalid display name format. Only ASCII characters are allowed.";
					new Toast(err);
					return err;
				}
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
				) {
					const err = "Invalid description format.";
					new Toast(err);
					return err;
				}
				return true;
			}
		},
		theme: station.value.theme,
		privacy: station.value.privacy,
		requestsEnabled: station.value.requests.enabled,
		requestsAccess: station.value.requests.access,
		requestsLimit: station.value.requests.limit,
		autofillEnabled: station.value.autofill.enabled,
		autofillLimit: station.value.autofill.limit,
		autofillMode: station.value.autofill.mode
	},
	(status, message, values) =>
		new Promise((resolve, reject) => {
			if (status === "success") {
				const oldStation = JSON.parse(JSON.stringify(station.value));
				const updatedStation = {
					...oldStation,
					name: values.name,
					displayName: values.displayName,
					description: values.description,
					theme: values.theme,
					privacy: values.privacy,
					requests: {
						...oldStation.requests,
						enabled: values.requestsEnabled,
						access: values.requestsAccess,
						limit: values.requestsLimit
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
						new Toast(res.message);
						if (res.status === "success") {
							editStation(updatedStation);
							resolve();
						} else reject(new Error(res.message));
					}
				);
			} else new Toast(message);
		}),
	{
		modalUuid: props.modalUuid
	}
);

watch(station, (value, oldValue) => {
	if (value.name !== oldValue.name) setOriginalValue("name", value.name);
	if (value.displayName !== oldValue.displayName)
		setOriginalValue("displayName", value.displayName);
	if (value.description !== oldValue.description)
		setOriginalValue("description", value.description);
	if (value.theme !== oldValue.theme) setOriginalValue("theme", value.theme);
	if (value.privacy !== oldValue.privacy)
		setOriginalValue("privacy", value.privacy);
	if (value.requests.enabled !== oldValue.requests.enabled)
		setOriginalValue("requestsEnabled", value.requests.enabled);
	if (value.requests.access !== oldValue.requests.access)
		setOriginalValue("requestsAccess", value.requests.access);
	if (value.requests.limit !== oldValue.requests.limit)
		setOriginalValue("requestsLimit", value.requests.limit);
	if (value.autofill.enabled !== oldValue.autofill.enabled)
		setOriginalValue("autofillEnabled", value.autofill.enabled);
	if (value.autofill.limit !== oldValue.autofill.limit)
		setOriginalValue("autofillLimit", value.autofill.limit);
	if (value.autofill.mode !== oldValue.autofill.mode)
		setOriginalValue("autofillMode", value.autofill.mode);
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

				<div
					v-if="inputs['requestsEnabled'].value"
					class="small-section"
				>
					<label class="label">Minimum access</label>
					<div class="control is-expanded select">
						<select v-model="inputs['requestsAccess'].value">
							<option value="owner" selected>Owner</option>
							<option value="user">User</option>
						</select>
					</div>
				</div>

				<div
					v-if="inputs['requestsEnabled'].value"
					class="small-section"
				>
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

				<div
					v-if="inputs['autofillEnabled'].value"
					class="small-section"
				>
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

				<div
					v-if="inputs['autofillEnabled'].value"
					class="small-section"
				>
					<label class="label">Play mode</label>
					<div class="control is-expanded select">
						<select v-model="inputs['autofillMode'].value">
							<option value="random" selected>Random</option>
							<option value="sequential">Sequential</option>
						</select>
					</div>
				</div>
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
