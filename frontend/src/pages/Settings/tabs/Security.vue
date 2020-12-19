<template>
	<div class="content security-tab">
		<h4 class="modal-section-title">
			Set a password
		</h4>
		<p class="modal-section-description">
			Set a password, as an alternative to signing in with GitHub.
		</p>

		<br />

		<router-link v-if="!isPasswordLinked" to="/set_password">
			Set Password
		</router-link>

		<button
			v-if="isPasswordLinked && isGithubLinked"
			class="button is-danger"
			@click="unlinkPassword()"
		>
			Remove logging in with password
		</button>

		<hr style="margin: 30px 0;" />

		<h4 class="modal-section-title">
			Link GitHub
		</h4>
		<p class="modal-section-description">
			Link your Musare account with GitHub
		</p>

		<br />

		<a
			v-if="!isGithubLinked"
			class="button is-github"
			:href="`${serverDomain}/auth/github/link`"
		>
			<div class="icon">
				<img class="invert" src="/assets/social/github.svg" />
			</div>
			&nbsp; Link GitHub to account
		</a>

		<button
			v-if="isPasswordLinked && isGithubLinked"
			class="button is-danger"
			@click="unlinkGitHub()"
		>
			Remove logging in with GitHub
		</button>

		<hr style="margin: 30px 0;" />

		<h4 class="modal-section-title">
			Log out everywhere
		</h4>
		<p class="modal-section-description">
			Remove all sessions for your account.
		</p>

		<br />

		<button class="button is-warning" @click="removeSessions()">
			Log out everywhere
		</button>
	</div>
</template>

<script>
import Toast from "toasters";
import { mapGetters } from "vuex";

import io from "../../../io";

export default {
	data() {
		return {
			serverDomain: ""
		};
	},
	computed: {
		...mapGetters({
			isPasswordLinked: "settings/isPasswordLinked",
			isGithubLinked: "settings/isGithubLinked"
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
		});

		lofig.get("serverDomain").then(serverDomain => {
			this.serverDomain = serverDomain;
		});
	},
	methods: {
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
