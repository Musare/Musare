<template>
	<div class="modal is-active">
		<div
			class="modal-background"
			@click="
				closeModal({
					sector: 'header',
					modal: 'register'
				})
			"
		/>
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">
					Register
				</p>
				<button
					class="delete"
					@click="
						closeModal({
							sector: 'header',
							modal: 'register'
						})
					"
				/>
			</header>
			<section class="modal-card-body">
				<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
				<label class="label">Email</label>
				<p class="control">
					<input
						v-model="email"
						class="input"
						type="text"
						placeholder="Email..."
						autofocus
					/>
				</p>
				<label class="label">Username</label>
				<p class="control">
					<input
						v-model="username"
						class="input"
						type="text"
						placeholder="Username..."
					/>
				</p>
				<label class="label">Password</label>
				<p class="control">
					<input
						v-model="password"
						class="input"
						type="password"
						placeholder="Password..."
						@keypress="$parent.submitOnEnter(submitModal, $event)"
					/>
				</p>
				<p>
					By logging in/registering you agree to our
					<router-link to="/terms"> Terms of Service </router-link
					>&nbsp;and
					<router-link to="/privacy"> Privacy Policy </router-link>.
				</p>
			</section>
			<footer class="modal-card-foot">
				<a class="button is-primary" href="#" @click="submitModal()"
					>Submit</a
				>
				<a
					class="button is-github"
					:href="serverDomain + '/auth/github/authorize'"
					@click="githubRedirect()"
				>
					<div class="icon">
						<img class="invert" src="/assets/social/github.svg" />
					</div>
					&nbsp;&nbsp;Register with GitHub
				</a>
			</footer>
		</div>
	</div>
</template>

<script>
import { mapActions } from "vuex";

import { Toast } from "vue-roaster";

export default {
	data() {
		return {
			username: "",
			email: "",
			password: "",
			recaptcha: {
				key: "",
				token: ""
			},
			serverDomain: ""
		};
	},
	mounted() {
		lofig.get("serverDomain", res => {
			this.serverDomain = res;
		});

		lofig.get("recaptcha", obj => {
			this.recaptcha.key = obj.key;

			const recaptchaScript = document.createElement("script");
			recaptchaScript.onload = () => {
				grecaptcha.ready(() => {
					grecaptcha
						.execute(this.recaptcha.key, { action: "login" })
						.then(token => {
							this.recaptcha.token = token;
						});
				});
			};

			recaptchaScript.setAttribute(
				"src",
				`https://www.google.com/recaptcha/api.js?render=${this.recaptcha.key}`
			);
			document.head.appendChild(recaptchaScript);
		});
	},
	methods: {
		submitModal() {
			console.log(this.recaptcha.token);

			this.register({
				username: this.username,
				email: this.email,
				password: this.password,
				recaptchaToken: this.recaptcha.token
			})
				.then(res => {
					if (res.status === "success") window.location.reload();
				})
				.catch(err => Toast.methods.addToast(err.message, 5000));
		},
		githubRedirect() {
			localStorage.setItem("github_redirect", this.$route.path);
		},
		...mapActions("modals", ["closeModal"]),
		...mapActions("user/auth", ["register"])
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.button.is-github {
	background-color: $dark-grey-2;
	color: $white !important;
}

.is-github:focus {
	background-color: $dark-grey-3;
}
.is-primary:focus {
	background-color: #028bca !important;
}

.invert {
	filter: brightness(5);
}

#recaptcha {
	padding: 10px 0;
}

a {
	color: $primary-color;
}
</style>

<style lang="scss">
@import "styles/global.scss";

.grecaptcha-badge {
	z-index: 2000;
}
</style>
