<template>
	<div class="content security-tab">
		<div v-if="!isPasswordLinked || (isPasswordLinked && isGithubLinked)">
			<h4 class="section-title" v-if="!isPasswordLinked">
				Set a password
			</h4>
			<h4 class="section-title" v-else>
				Remove password
			</h4>

			<p class="section-description" v-if="!isPasswordLinked">
				Set a password, as an alternative to signing in with GitHub.
			</p>
			<p class="section-description" v-else>
				Remove password from your Musare account.
			</p>

			<br />

			<router-link
				v-if="!isPasswordLinked"
				to="/set_password"
				class="button is-default"
				href="#"
				><i class="material-icons icon-with-button">create</i>Set
				Password
			</router-link>

			<a
				v-else
				class="button is-danger"
				href="#"
				@click.prevent="unlinkPassword()"
				><i class="material-icons icon-with-button">link_off</i>Remove
				logging in with password
			</a>

			<hr style="margin: 30px 0;" />
		</div>

		<div v-if="!isGithubLinked || (isPasswordLinked && isGithubLinked)">
			<h4 class="section-title">
				{{ isGithubLinked ? "Unlink" : "Link" }} GitHub
			</h4>
			<p class="section-description">
				{{ isGithubLinked ? "Unlink" : "Link" }} your Musare account
				with GitHub.
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

			<a
				v-else
				class="button is-danger"
				href="#"
				@click.prevent="unlinkGitHub()"
				><i class="material-icons icon-with-button">link_off</i>Remove
				logging in with GitHub
			</a>

			<hr style="margin: 30px 0;" />
		</div>

		<div>
			<h4 class="section-title">Log out everywhere</h4>
			<p class="section-description">
				Remove all sessions for your account.
			</p>

			<br />

			<a
				class="button is-warning"
				href="#"
				@click.prevent="removeSessions()"
				><i class="material-icons icon-with-button">exit_to_app</i>Log
				out everywhere
			</a>
		</div>
	</div>
</template>

<script>
import Toast from "toasters";
import { mapGetters, mapState } from "vuex";

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
		}),
		...mapState({
			userId: state => state.user.auth.userId
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
				console.log("hi");
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
.section-description {
	margin-bottom: 0 !important;
}
</style>
