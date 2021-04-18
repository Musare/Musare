<template>
	<div class="content account-tab">
		<h4 class="section-title">Change account details</h4>

		<p class="section-description">Keep these details up-to-date.</p>

		<hr class="section-horizontal-rule" />

		<p class="control is-expanded margin-top-zero">
			<label for="username">Username</label>
			<input
				class="input"
				id="username"
				type="text"
				placeholder="Enter username here..."
				v-model="modifiedUser.username"
				maxlength="32"
				autocomplete="off"
				@keypress="onInput('username')"
				@paste="onInput('username')"
			/>
			<span v-if="modifiedUser.username" class="character-counter"
				>{{ modifiedUser.username.length }}/32</span
			>
		</p>
		<transition name="fadein-helpbox">
			<input-help-box
				:entered="validation.username.entered"
				:valid="validation.username.valid"
				:message="validation.username.message"
			/>
		</transition>

		<p class="control is-expanded">
			<label for="email">Email</label>
			<input
				class="input"
				id="email"
				type="text"
				placeholder="Enter email address here..."
				v-if="modifiedUser.email"
				v-model="modifiedUser.email.address"
				@keypress="onInput('email')"
				@paste="onInput('email')"
				autocomplete="off"
			/>
		</p>
		<transition name="fadein-helpbox">
			<input-help-box
				:entered="validation.email.entered"
				:valid="validation.email.valid"
				:message="validation.email.message"
			/>
		</transition>

		<save-button ref="saveButton" @clicked="saveChanges()" />

		<!-- <div class="section-margin-bottom" />

		<h4 class="section-title">Export my data</h4>

		<p class="section-description">
			Download a copy of all data we store on you in JSON format.
		</p>

		<hr class="section-horizontal-rule" /> -->

		<div class="section-margin-bottom" />

		<h4 class="section-title">Remove any data we hold on you</h4>

		<p class="section-description">
			Permanently remove your account and/or data we store on you.
		</p>

		<hr class="section-horizontal-rule" />

		<div class="row">
			<confirm @confirm="removeActivities()">
				<a class="button is-warning">
					<i class="material-icons icon-with-button">clear</i>
					Clear my activities
				</a>
			</confirm>

			<a
				class="button is-danger"
				@click="
					openModal({
						sector: 'settings',
						modal: 'confirmAccountRemoval'
					})
				"
			>
				<i class="material-icons icon-with-button">delete</i>
				Remove my account
			</a>
		</div>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import Toast from "toasters";

import InputHelpBox from "@/components/InputHelpBox.vue";
import SaveButton from "@/components/SaveButton.vue";
import validation from "@/validation";
import Confirm from "@/components/Confirm.vue";

export default {
	components: {
		InputHelpBox,
		SaveButton,
		Confirm
	},
	data() {
		return {
			validation: {
				username: {
					entered: false,
					valid: false,
					message: "Please enter a valid username."
				},
				email: {
					entered: false,
					valid: false,
					message: "Please enter a valid email address."
				}
			}
		};
	},
	computed: {
		...mapState({
			userId: state => state.user.auth.userId,
			originalUser: state => state.settings.originalUser,
			modifiedUser: state => state.settings.modifiedUser
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		// prettier-ignore
		// eslint-disable-next-line func-names
		"modifiedUser.username": function (value) {
		if (!validation.isLength(value, 2, 32)) {
			this.validation.username.message =
				"Username must have between 2 and 32 characters.";
			this.validation.username.valid = false;
		} else if (
			!validation.regex.azAZ09_.test(value) &&
			value !== this.originalUser.username // Sometimes a username pulled from GitHub won't succeed validation
		) {
				this.validation.username.message =
					"Invalid format. Allowed characters: a-z, A-Z, 0-9 and _.";
				this.validation.username.valid = false;
			} else {
				this.validation.username.message = "Everything looks great!";
				this.validation.username.valid = true;
			}
		},
		// prettier-ignore
		// eslint-disable-next-line func-names
		"modifiedUser.email.address": function (value) {
			if (!validation.isLength(value, 3, 254)) {
				this.validation.email.message =
					"Email must have between 3 and 254 characters.";
				this.validation.email.valid = false;
			} else if (
				value.indexOf("@") !== value.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(value)
			) {
				this.validation.email.message = "Invalid format.";
				this.validation.email.valid = false;
			} else {
				this.validation.email.message = "Everything looks great!";
				this.validation.email.valid = true;
			}
		}
	},
	methods: {
		onInput(inputName) {
			this.validation[inputName].entered = true;
		},
		saveChanges() {
			const usernameChanged =
				this.modifiedUser.username !== this.originalUser.username;
			const emailAddressChanged =
				this.modifiedUser.email.address !==
				this.originalUser.email.address;

			if (usernameChanged) this.changeUsername();

			if (emailAddressChanged) this.changeEmail();

			if (!usernameChanged && !emailAddressChanged) {
				this.$refs.saveButton.handleFailedSave();

				new Toast("Please make a change before saving.");
			}
		},
		changeEmail() {
			const email = this.modifiedUser.email.address;
			if (!validation.isLength(email, 3, 254))
				return new Toast(
					"Email must have between 3 and 254 characters."
				);
			if (
				email.indexOf("@") !== email.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(email)
			)
				return new Toast("Invalid email format.");

			this.$refs.saveButton.saveStatus = "disabled";

			return this.socket.dispatch(
				"users.updateEmail",
				this.userId,
				email,
				res => {
					if (res.status !== "success") {
						new Toast(res.message);
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast("Successfully changed email address");

						this.updateOriginalUser({
							property: "email.address",
							value: email
						});

						this.$refs.saveButton.handleSuccessfulSave();
					}
				}
			);
		},
		changeUsername() {
			const { username } = this.modifiedUser;

			if (!validation.isLength(username, 2, 32))
				return new Toast(
					"Username must have between 2 and 32 characters."
				);

			if (!validation.regex.azAZ09_.test(username))
				return new Toast(
					"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _."
				);

			this.$refs.saveButton.saveStatus = "disabled";

			return this.socket.dispatch(
				"users.updateUsername",
				this.userId,
				username,
				res => {
					if (res.status !== "success") {
						new Toast(res.message);
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast("Successfully changed username");

						this.updateOriginalUser({
							property: "username",
							value: username
						});

						this.$refs.saveButton.handleSuccessfulSave();
					}
				}
			);
		},

		removeActivities() {
			this.socket.dispatch("activities.removeAllForUser", res => {
				new Toast(res.message);
			});
		},
		...mapActions("settings", ["updateOriginalUser"]),
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
.control {
	margin-bottom: 2px !important;
}

.row {
	display: flex;
}
</style>
