<template>
	<div class="content preferences-tab">
		<h4 class="section-title">Change preferences</h4>

		<p class="section-description">Tailor these settings to your liking.</p>

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

		<save-button ref="saveButton" @clicked="saveChanges()" />
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import Toast from "toasters";

import SaveButton from "@/components/SaveButton.vue";

export default {
	components: { SaveButton },
	data() {
		return {
			localNightmode: false,
			localAutoSkipDisliked: false,
			localActivityLogPublic: false,
			localAnonymousSongRequests: false,
			localActivityWatch: false
		};
	},
	computed: {
		...mapState({
			nightmode: state => state.user.preferences.nightmode,
			autoSkipDisliked: state => state.user.preferences.autoSkipDisliked,
			activityLogPublic: state =>
				state.user.preferences.activityLogPublic,
			anonymousSongRequests: state =>
				state.user.preferences.anonymousSongRequests,
			activityWatch: state => state.user.preferences.activityWatch
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch("users.getPreferences", res => {
			const { preferences } = res.data;

			if (res.status === "success") {
				this.localNightmode = preferences.nightmode;
				this.localAutoSkipDisliked = preferences.autoSkipDisliked;
				this.localActivityLogPublic = preferences.activityLogPublic;
				this.localAnonymousSongRequests =
					preferences.anonymousSongRequests;
				this.localActivityWatch = preferences.activityWatch;
			}
		});

		this.socket.on("keep.event:user.preferences.updated", res => {
			const { preferences } = res.data;

			this.localNightmode = preferences.nightmode;
			this.localAutoSkipDisliked = preferences.autoSkipDisliked;
			this.localActivityLogPublic = preferences.activityLogPublic;
			this.localAnonymousSongRequests = preferences.anonymousSongRequests;
			this.localActivityWatch = preferences.activityWatch;
		});
	},
	methods: {
		saveChanges() {
			if (
				this.localNightmode === this.nightmode &&
				this.localAutoSkipDisliked === this.autoSkipDisliked &&
				this.localActivityLogPublic === this.activityLogPublic &&
				this.localAnonymousSongRequests ===
					this.anonymousSongRequests &&
				this.localActivityWatch === this.activityWatch
			) {
				new Toast("Please make a change before saving.");

				return this.$refs.saveButton.handleFailedSave();
			}

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"users.updatePreferences",
				{
					nightmode: this.localNightmode,
					autoSkipDisliked: this.localAutoSkipDisliked,
					activityLogPublic: this.localActivityLogPublic,
					anonymousSongRequests: this.localAnonymousSongRequests,
					activityWatch: this.localActivityWatch
				},
				res => {
					if (res.status !== "success") {
						new Toast(res.message);
						return this.$refs.saveButton.handleFailedSave();
					}

					new Toast("Successfully updated preferences");
					return this.$refs.saveButton.handleSuccessfulSave();
				}
			);
		},
		...mapActions("user/preferences", [
			"changeNightmode",
			"changeAutoSkipDisliked",
			"changeActivityLogPublic",
			"changeAnonymousSongRequests",
			"changeActivityWatch"
		])
	}
};
</script>
