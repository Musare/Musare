<template>
	<div class="container">
		<img class="avatar" src="https://avatars2.githubusercontent.com/u/11198912?v=3&s=460"/>
		<h1 class="has-text-centered">@{{user.username}}</h1>
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

		},
		ready: function() {
			let local = this;
			local.socket = local.$parent.socket;
			local.socket.emit("/u/:username", local.$route.params.username, results => {
				local.user = results.data;
				local.liked = results.data.statistics.songsLiked.length;
				local.disliked = local.user.statistics.songsDisliked.length;
				local.requested = local.user.statistics.songsRequested;
			});
		}
	}
</script>

<style lang="scss">
	.avatar {
		border-radius: 50%;
		width: 250px;
		display: block;
		margin: auto;
	}

	.level {
		margin-top: 40px;
	}
</style>
