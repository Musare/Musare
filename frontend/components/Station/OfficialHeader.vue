<template>
	<nav class='nav'>
		<div class='nav-left'>
			<a class='nav-item logo' href='#' v-link='{ path: "/" }' @click='this.$dispatch("leaveStation", title)'>
				Musare
			</a>
			<a class='nav-item' href='#' v-if='isOwner()' @click='$parent.toggleModal("editStation")'>
				<span class='icon'>
					<i class='material-icons'>settings</i>
				</span>
			</a>
			<a class='nav-item' href='#' @click='$parent.toggleModal("addSongToQueue")' v-if='$parent.type === "official"'>
				<span class='icon'>
					<i class='material-icons'>queue_music</i>
				</span>
			</a>
			<a v-if='isOwner()' class='nav-item' href='#' @click='$parent.skipStation()'>
				<span class='icon'>
					<i class='material-icons'>skip_next</i>
				</span>
			</a>
			<a v-if='!isOwner() && $parent.$parent.loggedIn && $parent.currentSong' class='nav-item' href='#' @click='$parent.voteSkipStation()'>
				<span class='icon'>
					<i class='material-icons'>skip_next</i>
				</span>
				<span class="skip-votes">{{$parent.currentSong.skipVotes}}</span>
			</a>
			<a class='nav-item' href='#' v-if='isOwner() && $parent.paused' @click='$parent.resumeStation()'>
				<span class='icon'>
					<i class='material-icons'>play_arrow</i>
				</span>
			</a>
			<a class='nav-item' href='#' v-if='isOwner() && !$parent.paused' @click='$parent.pauseStation()'>
				<span class='icon'>
					<i class='material-icons'>pause</i>
				</span>
			</a>
		</div>

		<!--<div class='nav-center'>
			{{title}}
		</div>-->

		<span class="nav-toggle" :class="{ 'is-active': isMobile }" @click="isMobile = !isMobile">
			<span></span>
			<span></span>
			<span></span>
		</span>

		<div class="nav-right nav-menu" :class="{ 'is-active': isMobile }">
			<a v-if='$parent.$parent.loggedIn' class='nav-item' href='#' @click='$parent.modals.report = !$parent.modals.report'>
				<span class='icon'>
					<i class='material-icons'>report</i>
				</span>
			</a>
			<a class='nav-item' href='#' @click='$parent.sidebars.queue = !$parent.sidebars.queue' v-if='$parent.station.partyMode === true'>
				<span class='icon'>
					<i class='material-icons'>queue_music</i>
				</span>
			</a>
			<!--<a class='nav-item' href='#'>
				<span class='icon'>
					<i class='material-icons'>chat</i>
				</span>
			</a>-->
			<!--<a class='nav-item' href='#' @click='$parent.sidebars.users = !$parent.sidebars.users'>
				<span class='icon'>
					<i class='material-icons'>people</i>
				</span>
			</a>-->
			<a class='nav-item' href='#' @click='$parent.sidebars.playlist = !$parent.sidebars.playlist' v-if='$parent.type === "community"'>
				<span class='icon'>
					<i class='material-icons'>library_music</i>
				</span>
			</a>
		</div>
	</nav>
</template>

<script>
	export default {
		data() {
			return {
				title: this.$route.params.id,
				isMobile: false
			}
		},
		methods: {
			isOwner: function () {
				return this.$parent.$parent.role === 'admin' || this.$parent.$parent.userId === this.$parent.station.owner
			}
		}
	}
</script>

<style lang='scss' scoped>
	@import 'theme.scss';
	.nav {
		background-color: #03a9f4;
	}

	a.nav-item {
		color: $white;

		&:hover {
			color: $white;
		}

		padding: 0 18px;
		.icon {
			height: 64px;
			i {
				font-size: 2rem;
				line-height: 64px;
				height: 64px;
				width: 34px;
			}
		}
	}

	.nav-toggle {
		height: 64px;
	}

	.logo {
		font-size: 2.1rem;
		line-height: 64px;
		padding-left: 20px !important;
		padding-right: 20px !important;
	}

	.nav-center {
		display: flex;
    	align-items: center;
		text-transform: uppercase;
		color: $blue;
		font-size: 22px;
	}

	.nav-right.is-active .nav-item {
		background: #03a9f4;
    	border: 0;
	}
</style>
