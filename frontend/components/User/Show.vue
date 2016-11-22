<template>
	<toast></toast>
	<div class="container">
		<img class="avatar" src="https://avatars2.githubusercontent.com/u/11198912?v=3&s=460"/>
		<h2 class="has-text-centered">@{{user.username}}</h2>
		<div class="admin-functionality">
			<a class="button is-small is-info is-outlined" @click="changeRank('admin')">Promote to Admin</a>
			<a class="button is-small is-danger is-outlined" @click="changeRank('user')">Demote to User</a>
		</div>
		<nav class="level">
			<div class="level-item has-text-centered">
				<p class="heading">Rank</p>
				<p class="title">User</p>
			</div>
			<div class="level-item has-text-centered">
				<p class="heading">Songs Requested</p>
				<p class="title">{{requested}}</p>
			</div>
			<div class="level-item has-text-centered">
				<p class="heading">Likes</p>
				<p class="title">{{liked}}</p>
			</div>
			<div class="level-item has-text-centered">
				<p class="heading">Dislikes</p>
				<p class="title">{{disliked}}</p>
			</div>
		</nav>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	export default {
		data() {
			return {
				user: {},
				liked: 0,
				disliked: 0,
				requested: 0
			}
		},
		methods: {
			changeRank(newRank) {
				console.log(rank);
				Toast.methods.addToast(`User ${this.$route.params.username} has been promoted to the rank of ${rank}`, 200000);
			}
		},
		ready: function() {
			let local = this;
			local.socket = local.$parent.socket;
			local.socket.emit('users.findByUsername', local.$route.params.username, results => {
				local.user = results.data;
				console.log(local.user)
				local.liked = results.data.statistics.songsLiked.length;
				local.disliked = local.user.statistics.songsDisliked.length;
				local.requested = local.user.statistics.songsRequested;
			});
		},
		components: { Toast }
	}
</script>

<style lang="scss" scoped>
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
