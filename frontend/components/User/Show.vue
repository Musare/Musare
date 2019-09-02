<template>
	<div v-if="isUser">
		<metadata v-bind:title="`Profile | ${user.username}`" />
		<main-header />
		<div class="container">
			<img class="avatar" src="/assets/notes.png" />
			<h2 class="has-text-centered username">@{{ user.username }}</h2>
			<h5>A member since {{ user.createdAt }}</h5>
			<div
				v-if="role === 'admin' && userId !== user._id"
				class="admin-functionality"
			>
				<a
					v-if="user.role == 'default'"
					class="button is-small is-info is-outlined"
					@click="changeRank('admin')"
					>Promote to Admin</a
				>
				<a
					v-if="user.role == 'admin'"
					class="button is-small is-danger is-outlined"
					@click="changeRank('default')"
					>Demote to User</a
				>
			</div>
			<nav class="level">
				<div class="level-item has-text-centered">
					<p class="heading">
						Rank
					</p>
					<p class="title role">
						{{ user.role }}
					</p>
				</div>
				<div class="level-item has-text-centered">
					<p class="heading">
						Songs Requested
					</p>
					<p class="title">
						{{ user.statistics.songsRequested }}
					</p>
				</div>
				<div class="level-item has-text-centered">
					<p class="heading">
						Likes
					</p>
					<p class="title">
						{{ user.liked.length }}
					</p>
				</div>
				<div class="level-item has-text-centered">
					<p class="heading">
						Dislikes
					</p>
					<p class="title">
						{{ user.disliked.length }}
					</p>
				</div>
			</nav>
		</div>
		<main-footer />
	</div>
</template>

<script>
import { mapState } from "vuex";
import { Toast } from "vue-roaster";
import { format, parseISO } from "date-fns";

import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";
import io from "../../io";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {
			user: {},
			isUser: false
		};
	},
	computed: mapState({
		role: state => state.user.auth.role,
		userId: state => state.user.auth.userId
	}),
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit(
				"users.findByUsername",
				this.$route.params.username,
				res => {
					if (res.status === "error") this.$router.go("/404");
					else {
						this.user = res.data;
						this.user.createdAt = format(
							parseISO(this.user.createdAt),
							"MMMM do yyyy"
						);
						this.isUser = true;
					}
				}
			);
		});
	},
	methods: {
		changeRank(newRank) {
			this.socket.emit(
				"users.updateRole",
				this.user._id,
				newRank === "admin" ? "admin" : "default",
				res => {
					if (res.status === "error")
						Toast.methods.addToast(res.message, 2000);
					else this.user.role = newRank;
					Toast.methods.addToast(
						`User ${this.$route.params.username}'s rank has been changed to: ${newRank}`,
						2000
					);
				}
			);
		}
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.container {
	padding: 25px;
}

.avatar {
	border-radius: 50%;
	width: 250px;
	display: block;
	margin: auto;
}

h5 {
	text-align: center;
	margin-bottom: 25px;
	font-size: 17px;
}

.role {
	text-transform: capitalize;
}

.level {
	margin-top: 40px;
}

.admin-functionality {
	text-align: center;
	margin: 0 auto;
}

@media (max-width: 350px) {
	.username {
		font-size: 2.9rem;
		word-wrap: break-all;
	}
}
</style>
