<template>
	<div v-if="isUser">
		<main-header></main-header>
		<div class="container">
			<img class="avatar" src="https://avatars2.githubusercontent.com/u/11198912?v=3&s=460"/>
			<h2 class="has-text-centered">@{{user.username}}</h2>
			<div class="admin-functionality">
				<a class="button is-small is-info is-outlined" @click="changeRank('admin')" v-if="user.role == 'default'">Promote to Admin</a>
				<a class="button is-small is-danger is-outlined" @click="changeRank('default')" v-else>Demote to User</a>
			</div>
			<nav class="level">
				<div class="level-item has-text-centered">
					<p class="heading">Rank</p>
					<p class="title">User</p>
				</div>
				<div class="level-item has-text-centered">
					<p class="heading">Songs Requested</p>
					<p class="title">{{ user.statistics.songsRequested }}</p>
				</div>
				<div class="level-item has-text-centered">
					<p class="heading">Likes</p>
					<p class="title">{{ user.statistics.songsLiked.length }}</p>
				</div>
				<div class="level-item has-text-centered">
					<p class="heading">Dislikes</p>
					<p class="title">{{ user.statistics.songsDisliked.length }}</p>
				</div>
			</nav>
		</div>
		<main-footer></main-footer>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';

	export default {
		data() {
			return {
				user: {},
				isUser: false,
			}
		},
		methods: {
			changeRank(newRank) {
				this.socket.emit('users.update', 'role', ((newRank == 'admin') ? 'admin' : 'default'), res => {
					if (res.status == 'error') Toast.methods.addToast(res.message, 2000);
					else this.user.role = newRank; Toast.methods.addToast(`User ${this.$route.params.username}'s rank has been changed to: ${newRank}`, 2000);
				});
			}
		},
		ready: function() {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.socket) {
					_this.socket = _this.$parent.socket;
					_this.socket.emit('users.findByUsername', _this.$route.params.username, res => {
						if (res.status == 'error') this.$router.go('/404');
						else _this.user = res.data; _this.isUser = true;
					});
					clearInterval(socketInterval);
				}
			}, 100);
		},
		components: { MainHeader, MainFooter },
	}
</script>

<style lang="scss" scoped>
	.container {
		padding: 25px;
	}

	.avatar {
		border-radius: 50%;
		width: 250px;
		display: block;
		margin: auto;
	}

	.level {
		margin-top: 40px;
	}

	.admin-functionality {
		text-align: center;
		margin: 0 auto;
	}
</style>
