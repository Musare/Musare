<script setup lang="ts">
import { defineAsyncComponent, onMounted } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useForm } from "@/composables/useForm";
import { useEvents } from "@/composables/useEvents";
import { useModels } from "@/composables/useModels";
import { useWebsocketStore } from "@/stores/websocket";
import { useUserAuthStore } from "@/stores/userAuth";

const SaveButton = defineAsyncComponent(
	() => import("@/components/SaveButton.vue")
);

const { runJob } = useWebsocketStore();
const { onReady } = useEvents();
const { registerModel } = useModels();

const userAuthStore = useUserAuthStore();

const { currentUser } = storeToRefs(userAuthStore);

const { inputs, saveButton, save, setModelValues } = useForm(
	{
		nightmode: false,
		autoSkipDisliked: false,
		activityLogPublic: false,
		anonymousSongRequests: false,
		activityWatch: false
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success") {
			runJob(`data.users.updateById`, {
				_id: currentUser.value._id,
				query: values
			})
				.then(resolve)
				.catch(reject);
		} else {
			if (status === "unchanged") new Toast(messages.unchanged);
			else if (status === "error")
				Object.values(messages).forEach(message => {
					new Toast({ content: message, timeout: 8000 });
				});
			resolve();
		}
	}
);

onMounted(async () => {
	await onReady(async () => {
		setModelValues(await registerModel(currentUser.value), [
			"nightmode",
			"autoSkipDisliked",
			"activityLogPublic",
			"anonymousSongRequests",
			"activityWatch"
		]);
	});
});
</script>

<template>
	<div class="content preferences-tab">
		<h4 class="section-title">Change preferences</h4>

		<p class="section-description">Tailor these settings to your liking</p>

		<hr class="section-horizontal-rule" />

		<p class="control is-expanded checkbox-control">
			<label class="switch">
				<input
					type="checkbox"
					id="nightmode"
					v-model="inputs.nightmode.value"
				/>
				<span class="slider round"></span>
			</label>

			<label for="nightmode">
				<p>Use nightmode</p>
			</label>
		</p>

		<p class="control is-expanded checkbox-control">
			<label class="switch">
				<input
					type="checkbox"
					id="autoSkipDisliked"
					v-model="inputs.autoSkipDisliked.value"
				/>
				<span class="slider round"></span>
			</label>

			<label for="autoSkipDisliked">
				<p>Automatically vote to skip disliked songs</p>
			</label>
		</p>

		<p class="control is-expanded checkbox-control">
			<label class="switch">
				<input
					type="checkbox"
					id="activityLogPublic"
					v-model="inputs.activityLogPublic.value"
				/>
				<span class="slider round"></span>
			</label>

			<label for="activityLogPublic">
				<p>Allow my activity log to be viewed publicly</p>
			</label>
		</p>

		<p class="control is-expanded checkbox-control">
			<label class="switch">
				<input
					type="checkbox"
					id="anonymousSongRequests"
					v-model="inputs.anonymousSongRequests.value"
				/>
				<span class="slider round"></span>
			</label>

			<label for="anonymousSongRequests">
				<span></span>
				<p>Request songs anonymously</p>
			</label>
		</p>

		<p class="control is-expanded checkbox-control">
			<label class="switch">
				<input
					type="checkbox"
					id="activityWatch"
					v-model="inputs.activityWatch.value"
				/>
				<span class="slider round"></span>
			</label>

			<label for="activityWatch">
				<span></span>
				<p>Use ActivityWatch integration (requires extension)</p>
			</label>
		</p>

		<SaveButton ref="saveButton" @clicked="save()" />
	</div>
</template>
