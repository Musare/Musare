<template>
	<div class="content security-tab">
		<div v-if="isPasswordLinked">
			<h4 class="section-title">Change password</h4>

			<p class="section-description">
				You will need to know your previous password
			</p>

			<hr class="section-horizontal-rule" />

			<p class="control is-expanded margin-top-zero">
				<label for="old-password">Previous password</label>
			</p>

			<div id="password-visibility-container">
				<input
					class="input"
					id="old-password"
					ref="oldPassword"
					type="password"
					placeholder="Enter your old password here..."
					v-model="validation.oldPassword.value"
				/>
				<a @click="togglePasswordVisibility('oldPassword')">
					<i class="material-icons">
						{{
							!validation.oldPassword.visible
								? "visibility"
								: "visibility_off"
						}}
					</i>
				</a>
			</div>

			<p class="control is-expanded">
				<label for="new-password">New password</label>
			</p>

			<div id="password-visibility-container">
				<input
					class="input"
					id="new-password"
					type="password"
					ref="newPassword"
					placeholder="Enter new password here..."
					v-model="validation.newPassword.value"
					@keyup.enter="changePassword()"
					@keypress="onInput('newPassword')"
					@paste="onInput('newPassword')"
				/>

				<a @click="togglePasswordVisibility('newPassword')">
					<i class="material-icons">
						{{
							!validation.newPassword.visible
								? "visibility"
								: "visibility_off"
						}}
					</i>
				</a>
			</div>

			<transition name="fadein-helpbox">
				<input-help-box
					:entered="validation.newPassword.entered"
					:valid="validation.newPassword.valid"
					:message="validation.newPassword.message"
				/>
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
				Add a password, as an alternative to signing in with GitHub
			</p>

			<hr class="section-horizontal-rule" />

			<router-link to="/set_password" class="button is-default"
				><i class="material-icons icon-with-button">create</i>Set
				Password
			</router-link>

			<div class="section-margin-bottom" />
		</div>

		<div v-if="!isGithubLinked">
			<h4 class="section-title">Link your GitHub account</h4>
			<p class="section-description">
				Link your Musare account with GitHub
			</p>

			<hr class="section-horizontal-rule" />

			<a class="button is-github" :href="`${apiDomain}/auth/github/link`">
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
				Remove your password as a login method or unlink GitHub
			</p>

			<hr class="section-horizontal-rule" />

			<div class="row">
				<quick-confirm
					v-if="isPasswordLinked"
					@confirm="unlinkPassword()"
				>
					<a class="button is-danger">
						<i class="material-icons icon-with-button">close</i>
						Remove password
					</a>
				</quick-confirm>
				<quick-confirm v-if="isGithubLinked" @confirm="unlinkGitHub()">
					<a class="button is-danger">
						<i class="material-icons icon-with-button">link_off</i>
						Remove GitHub from account
					</a>
				</quick-confirm>
			</div>

			<div class="section-margin-bottom" />
		</div>

		<div>
			<h4 class="section-title">Log out everywhere</h4>
			<p class="section-description">
				Remove all currently logged-in sessions for your account
			</p>

			<hr class="section-horizontal-rule" />
			<div class="row">
				<quick-confirm @confirm="removeSessions()">
					<a class="button is-warning">
						<i class="material-icons icon-with-button"
							>exit_to_app</i
						>
						Logout everywhere
					</a>
				</quick-confirm>
			</div>
		</div>
	</div>
</template>

<script>
import Toast from "toasters";
import { mapGetters, mapState } from "vuex";

import InputHelpBox from "@/components/InputHelpBox.vue";
import validation from "@/validation";
import QuickConfirm from "@/components/QuickConfirm.vue";

export default {
	components: { InputHelpBox, QuickConfirm },
	data() {
		return {
			apiDomain: "",
			validation: {
				oldPassword: {
					value: "",
					visible: false
				},
				newPassword: {
					value: "",
					visible: false,
					valid: false,
					entered: false,
					message:
						"Include at least one lowercase letter, one uppercase letter, one number and one special character."
				}
			}
		};
	},
	computed: {
		...mapGetters({
			isPasswordLinked: "settings/isPasswordLinked",
			isGithubLinked: "settings/isGithubLinked",
			socket: "websockets/getSocket"
		}),
		...mapState({
			userId: state => state.user.auth.userId
		})
	},
	watch: {
		// eslint-disable-next-line func-names
		"validation.newPassword.value": function (value) {
			if (!validation.isLength(value, 6, 200)) {
				this.validation.newPassword.message =
					"Password must have between 6 and 200 characters.";
				this.validation.newPassword.valid = false;
			} else if (!validation.regex.password.test(value)) {
				this.validation.newPassword.message =
					"Include at least one lowercase letter, one uppercase letter, one number and one special character.";
				this.validation.newPassword.valid = false;
			} else {
				this.validation.newPassword.message = "Everything looks great!";
				this.validation.newPassword.valid = true;
			}
		}
	},
	async mounted() {
		this.apiDomain = await lofig.get("backend.apiDomain");
	},
	methods: {
		togglePasswordVisibility(ref) {
			if (this.$refs[ref].type === "password") {
				this.$refs[ref].type = "text";
				this.validation[ref].visible = true;
			} else {
				this.$refs[ref].type = "password";
				this.validation[ref].visible = false;
			}
		},
		onInput(inputName) {
			this.validation[inputName].entered = true;
		},
		changePassword() {
			const newPassword = this.validation.newPassword.value;

			if (this.validation.oldPassword.value === "")
				return new Toast("Please enter your previous password.");

			if (!this.validation.newPassword.valid)
				return new Toast("Please enter a valid new password.");

			return this.socket.dispatch(
				"users.updatePassword",
				this.validation.oldPassword.value,
				newPassword,
				res => {
					if (res.status !== "success") new Toast(res.message);
					else {
						this.validation.oldPassword.value = "";
						this.validation.newPassword.value = "";

						new Toast("Successfully changed password.");
					}
				}
			);
		},
		unlinkPassword() {
			this.socket.dispatch("users.unlinkPassword", res => {
				new Toast(res.message);
			});
		},
		unlinkGitHub() {
			this.socket.dispatch("users.unlinkGitHub", res => {
				new Toast(res.message);
			});
		},
		removeSessions() {
			this.socket.dispatch(`users.removeSessions`, this.userId, res => {
				new Toast(res.message);
			});
		}
	}
};
</script>

<style lang="less" scoped>
#change-password-button {
	margin-top: 10px;
}

.control {
	margin-bottom: 2px !important;
}

.row {
	display: flex;
}
</style>
