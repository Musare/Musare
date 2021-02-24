<template>
	<div class="content security-tab">
		<div v-if="isPasswordLinked">
			<h4 class="section-title">Change password</h4>

			<p class="section-description">
				You will need to know your previous password.
			</p>

			<hr class="section-horizontal-rule" />

			<p class="control is-expanded margin-top-zero">
				<label for="previous-password">Previous password</label>
				<input
					class="input"
					id="previous-password"
					type="password"
					placeholder="Enter your old password here..."
					v-model="previousPassword"
				/>
			</p>

			<p id="new-password-again-input" class="control is-expanded">
				<label for="new-password">New password</label>
				<input
					class="input"
					id="new-password"
					type="password"
					placeholder="Enter new password here..."
					v-model="validation.newPassword.value"
					@keyup.enter="changePassword()"
					@blur="onInputBlur('newPassword')"
				/>
			</p>

			<transition name="fadein-helpbox">
				<input-help-box
					v-if="validation.newPassword.entered"
					:valid="validation.newPassword.valid"
					:message="validation.newPassword.message"
				></input-help-box>
			</transition>

			<p class="control">
				<button
					id="change-password-button"
					class="button is-success"
					@click.prevent="changePassword()"
				>
					Change password
				</button>
			</p>

			<div class="section-margin-bottom" />
		</div>

		<div v-if="!isPasswordLinked">
			<h4 class="section-title">Add a password</h4>
			<p class="section-description">
				Add a password, as an alternative to signing in with GitHub.
			</p>

			<hr class="section-horizontal-rule" />

			<router-link to="/set_password" class="button is-default" href="#"
				><i class="material-icons icon-with-button">create</i>Set
				Password
			</router-link>

			<div class="section-margin-bottom" />
		</div>

		<div v-if="!isGithubLinked">
			<h4 class="section-title">Link GitHub</h4>
			<p class="section-description">
				Link your Musare account with GitHub.
			</p>

			<hr class="section-horizontal-rule" />

			<a
				class="button is-github"
				:href="`${serverDomain}/auth/github/link`"
			>
				<div class="icon">
					<img class="invert" src="/assets/social/github.svg" />
				</div>
				&nbsp; Link GitHub to account
			</a>

			<div class="section-margin-bottom" />
		</div>

		<div v-if="isPasswordLinked && isGithubLinked">
			<h4 class="section-title">Remove login methods</h4>
			<p class="section-description">
				Remove your password as a login method or unlink GitHub.
			</p>

			<hr class="section-horizontal-rule" />

			<div>
				<a
					v-if="isPasswordLinked"
					class="button is-danger"
					href="#"
					@click.prevent="unlinkPassword()"
				>
					<i class="material-icons icon-with-button">close</i>
					Remove password
				</a>

				<a
					class="button is-danger"
					href="#"
					@click.prevent="unlinkGitHub()"
				>
					<i class="material-icons icon-with-button">link_off</i>
					Remove GitHub from account
				</a>
			</div>

			<div class="section-margin-bottom" />
		</div>

		<div>
			<h4 class="section-title">Log out everywhere</h4>
			<p class="section-description">
				Remove all currently logged-in sessions for your account.
			</p>

			<hr class="section-horizontal-rule" />

			<a
				class="button is-warning"
				href="#"
				@click.prevent="removeSessions()"
			>
				<i class="material-icons icon-with-button">exit_to_app</i>
				Log out everywhere
			</a>
		</div>
	</div>
</template>

<script>
import Toast from "toasters";
import { mapGetters, mapState } from "vuex";

import io from "../../../io";
import validation from "../../../validation";

import InputHelpBox from "../../../components/ui/InputHelpBox.vue";

export default {
	components: { InputHelpBox },
	data() {
		return {
			serverDomain: "",
			previousPassword: "",
			validation: {
				newPassword: {
					value: "",
					valid: false,
					entered: false,
					message: "Please enter a valid password."
				}
			}
		};
	},
	computed: {
		...mapGetters({
			isPasswordLinked: "settings/isPasswordLinked",
			isGithubLinked: "settings/isGithubLinked"
		}),
		...mapState({
			userId: state => state.user.auth.userId
		})
	},
	watch: {
		// eslint-disable-next-line func-names
		"validation.newPassword.value": function(value) {
			if (!validation.isLength(value, 6, 200)) {
				this.validation.newPassword.message =
					"Password must have between 6 and 200 characters.";
				this.validation.newPassword.valid = false;
			} else if (!validation.regex.password.test(value)) {
				this.validation.newPassword.message =
					"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.";
				this.validation.newPassword.valid = false;
			} else {
				this.validation.newPassword.message = "Everything looks great!";
				this.validation.newPassword.valid = true;
			}
		}
	},
	async mounted() {
		io.getSocket(socket => {
			this.socket = socket;
		});

		this.serverDomain = await lofig.get("serverDomain");
	},
	methods: {
		onInputBlur(inputName) {
			this.validation[inputName].entered = true;
		},
		changePassword() {
			const newPassword = this.validation.newPassword.value;

			if (this.previousPassword === "")
				return new Toast({
					content: "Please enter a previous password.",
					timeout: 8000
				});

			if (!this.validation.newPassword.valid)
				return new Toast({
					content: "Please enter a valid new password.",
					timeout: 8000
				});

			return this.socket.emit(
				"users.updatePassword",
				this.previousPassword,
				newPassword,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else {
						this.previousPassword = "";
						this.validation.newPassword.value = "";

						new Toast({
							content: "Successfully changed password.",
							timeout: 4000
						});
					}
				}
			);
		},
		unlinkPassword() {
			this.socket.emit("users.unlinkPassword", res => {
				new Toast({ content: res.message, timeout: 8000 });
			});
		},
		unlinkGitHub() {
			this.socket.emit("users.unlinkGitHub", res => {
				new Toast({ content: res.message, timeout: 8000 });
			});
		},
		removeSessions() {
			this.socket.emit(`users.removeSessions`, this.userId, res => {
				new Toast({ content: res.message, timeout: 4000 });
			});
		}
	}
};
</script>

<style lang="scss" scoped>
#change-password-button {
	margin-top: 10px;
}
</style>
