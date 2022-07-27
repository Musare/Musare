<script setup lang="ts">
import { defineAsyncComponent, ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import ws from "@/ws";

const SaveButton = defineAsyncComponent(
	() => import("@/components/SaveButton.vue")
);

const store = useStore();

const { socket } = useWebsocketsStore();

const saveButton = ref();

const localNightmode = ref(false);
const localAutoSkipDisliked = ref(false);
const localActivityLogPublic = ref(false);
const localAnonymousSongRequests = ref(false);
const localActivityWatch = ref(false);

const nightmode = computed(() => store.state.user.preferences.nightmode);
const autoSkipDisliked = computed(
	() => store.state.user.preferences.autoSkipDisliked
);
const activityLogPublic = computed(
	() => store.state.user.preferences.activityLogPublic
);
const anonymousSongRequests = computed(
	() => store.state.user.preferences.anonymousSongRequests
);
const activityWatch = computed(
	() => store.state.user.preferences.activityWatch
);

const saveChanges = () => {
	if (
		localNightmode.value === nightmode.value &&
		localAutoSkipDisliked.value === autoSkipDisliked.value &&
		localActivityLogPublic.value === activityLogPublic.value &&
		localAnonymousSongRequests.value === anonymousSongRequests.value &&
		localActivityWatch.value === activityWatch.value
	) {
		new Toast("Please make a change before saving.");

		return saveButton.value.handleFailedSave();
	}

	saveButton.value.status = "disabled";

	return socket.dispatch(
		"users.updatePreferences",
		{
			nightmode: localNightmode.value,
			autoSkipDisliked: localAutoSkipDisliked.value,
			activityLogPublic: localActivityLogPublic.value,
			anonymousSongRequests: localAnonymousSongRequests.value,
			activityWatch: localActivityWatch.value
		},
		res => {
			if (res.status !== "success") {
				new Toast(res.message);
				return saveButton.value.handleFailedSave();
			}

			new Toast("Successfully updated preferences");
			return saveButton.value.handleSuccessfulSave();
		}
	);
};

onMounted(() => {
	ws.onConnect(() =>
		socket.dispatch("users.getPreferences", res => {
			const { preferences } = res.data;

			if (res.status === "success") {
				localNightmode.value = preferences.nightmode;
				localAutoSkipDisliked.value = preferences.autoSkipDisliked;
				localActivityLogPublic.value = preferences.activityLogPublic;
				localAnonymousSongRequests.value =
					preferences.anonymousSongRequests;
				localActivityWatch.value = preferences.activityWatch;
			}
		})
	);

	socket.on("keep.event:user.preferences.updated", res => {
		const { preferences } = res.data;

		if (preferences.nightmode !== undefined)
			localNightmode.value = preferences.nightmode;

		if (preferences.autoSkipDisliked !== undefined)
			localAutoSkipDisliked.value = preferences.autoSkipDisliked;

		if (preferences.activityLogPublic !== undefined)
			localActivityLogPublic.value = preferences.activityLogPublic;

		if (preferences.anonymousSongRequests !== undefined)
			localAnonymousSongRequests.value =
				preferences.anonymousSongRequests;

		if (preferences.activityWatch !== undefined)
			localActivityWatch.value = preferences.activityWatch;
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
					v-model="localNightmode"
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
					v-model="localAutoSkipDisliked"
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
					v-model="localActivityLogPublic"
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
					v-model="localAnonymousSongRequests"
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
					v-model="localActivityWatch"
				/>
				<span class="slider round"></span>
			</label>

			<label for="activityWatch">
				<span></span>
				<p>Use ActivityWatch integration (requires extension)</p>
			</label>
		</p>

		<SaveButton ref="saveButton" @clicked="saveChanges()" />
	</div>
</template>
