<template>
	<div class="content preferences-tab">
		<h4 class="section-title">Change preferences</h4>

		<p class="section-description">Tailor these settings to your liking.</p>

		<hr class="section-horizontal-rule" />

		<p class="control is-expanded checkbox-control">
			<input type="checkbox" id="nightmode" v-model="localNightmode" />
			<label for="nightmode">
				<span></span>
				<p>Use nightmode</p>
			</label>
		</p>
		<p class="control is-expanded checkbox-control">
			<input
				type="checkbox"
				id="autoSkipDisliked"
				v-model="localAutoSkipDisliked"
			/>
			<label for="autoSkipDisliked">
				<span></span>
				<p>Automatically vote to skip disliked songs</p>
			</label>
		</p>
		<p class="control is-expanded checkbox-control">
			<input
				type="checkbox"
				id="activityLogPublic"
				v-model="localActivityLogPublic"
			/>
			<label for="activityLogPublic">
				<span></span>
				<p>Allow my activity log to be viewed publicly</p>
			</label>
		</p>
		<transition name="saving-changes-transition" mode="out-in">
			<button
				class="button save-changes"
				:class="saveButtonStyle"
				@click="saveChanges()"
				:key="saveStatus"
				:disabled="saveStatus === 'disabled'"
				v-html="saveButtonMessage"
			/>
		</transition>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";

import io from "../../../io";
import SaveButton from "../../../mixins/SaveButton.vue";

export default {
	mixins: [SaveButton],
	data() {
		return {
			localNightmode: false,
			localAutoSkipDisliked: false,
			localActivityLogPublic: false
		};
	},
	computed: mapState({
		nightmode: state => state.user.preferences.nightmode,
		autoSkipDisliked: state => state.user.preferences.autoSkipDisliked,
		activityLogPublic: state => state.user.preferences.activityLogPublic
	}),
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			this.socket.emit("users.getPreferences", res => {
				if (res.status === "success") {
					this.localNightmode = res.data.nightmode;
					this.localAutoSkipDisliked = res.data.autoSkipDisliked;
					this.localActivityLogPublic = res.data.activityLogPublic;
				}
			});

			socket.on("keep.event:user.preferences.changed", preferences => {
				console.log("changed");
				this.localNightmode = preferences.nightmode;
				this.localAutoSkipDisliked = preferences.autoSkipDisliked;
				this.localActivityLogPublic = preferences.activityLogPublic;
			});
		});
	},
	methods: {
		saveChanges() {
			if (
				this.localNightmode === this.nightmode &&
				this.localAutoSkipDisliked === this.autoSkipDisliked &&
				this.localActivityLogPublic === this.activityLogPublic
			) {
				new Toast({
					content: "Please make a change before saving.",
					timeout: 5000
				});

				return this.handleFailedSave();
			}

			this.saveStatus = "disabled";

			return this.socket.emit(
				"users.updatePreferences",
				{
					nightmode: this.localNightmode,
					autoSkipDisliked: this.localAutoSkipDisliked,
					activityLogPublic: this.localActivityLogPublic
				},
				res => {
					if (res.status !== "success") {
						new Toast({ content: res.message, timeout: 8000 });

						return this.handleFailedSave();
					}

					new Toast({
						content: "Successfully updated preferences",
						timeout: 4000
					});

					return this.handleSuccessfulSave();
				}
			);
		},
		...mapActions("user/preferences", [
			"changeNightmode",
			"changeAutoSkipDisliked",
			"changeActivityLogPublic"
		])
	}
};
</script>

<style lang="scss" scoped>
.checkbox-control {
	input[type="checkbox"] {
		opacity: 0;
		position: absolute;
	}

	label {
		display: flex;
		flex-direction: row;
		align-items: center;

		span {
			cursor: pointer;
			width: 24px;
			height: 24px;
			background-color: var(--white);
			display: inline-block;
			border: 1px solid var(--dark-grey-2);
			position: relative;
			border-radius: 3px;
		}

		p {
			margin-left: 10px;
		}
	}

	input[type="checkbox"]:checked + label span::after {
		content: "";
		width: 18px;
		height: 18px;
		left: 2px;
		top: 2px;
		border-radius: 3px;
		background-color: var(--primary-color);
		position: absolute;
	}
}
</style>
