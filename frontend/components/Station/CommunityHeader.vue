<template>
	<nav class='nav'>
		<div class='nav-left'>
			<a class='nav-item logo' href='#' v-link='{ path: "/" }' @click='this.$dispatch("leaveStation", title)'>
				Musare
			</a>
			<a class='nav-item' href='#' v-if='isOwner()' @click='$parent.editStation()'>
				<span class='icon'>
					<i class='material-icons'>settings</i>
				</span>
			</a>
			<a v-if='isOwner()' class='nav-item' href='#' @click='$parent.skipStation()'>
				<span class='icon'>
					<i class='material-icons'>skip_next</i>
				</span>
			</a>
			<a v-if='!isOwner() && $parent.$parent.loggedIn && !$parent.noSong' class='nav-item' href='#' @click='$parent.voteSkipStation()'>
				<span class='icon'>
					<i class='material-icons'>skip_next</i>
				</span>
				<span class="skip-votes">{{ $parent.currentSong.skipVotes }}</span>
			</a>
			<a v-if='$parent.$parent.loggedIn && !$parent.noSong && !$parent.simpleSong' class='nav-item' href='#' @click='$parent.modals.report = !$parent.modals.report'>
				<span class='icon'>
					<i class='material-icons'>report</i>
				</span>
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

		<div class='nav-center stationDisplayName'>
			{{$parent.station.displayName}}
		</div>

		<span class="nav-toggle" :class="{ 'is-active': isMobile }" @click="isMobile = !isMobile">
			<span></span>
			<span></span>
			<span></span>
		</span>

		<div class="nav-right nav-menu" :class="{ 'is-active': isMobile }">
			<a class='nav-item' href='#' @click='$parent.toggleSidebar("songslist")' v-if='$parent.station.partyMode === true'>
				<span class='icon'>
					<i class='material-icons'>queue_music</i>
				</span>
			</a>
			<!--<a class='nav-item' href='#'>
				<span class='icon'>
					<i class='material-icons'>chat</i>
				</span>
			</a>-->
			<a class='nav-item' href='#' @click='$parent.toggleSidebar("users")'>
				<span class='icon'>
					<i class='material-icons'>people</i>
				</span>
			</a>
			<a class='nav-item' href='#' @click='$parent.toggleSidebar("playlist")' v-if='$parent.$parent.loggedIn'>
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
				return this.$parent.$parent.loggedIn && (this.$parent.$parent.role === 'admin' || this.$parent.$parent.userId === this.$parent.station.owner);
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

	.skip-votes {
		position: relative;
		left: 11px;
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
		color: $blue;
		font-size: 22px;
	}

	.nav-right.is-active .nav-item {
		background: #03a9f4;
    	border: 0;
	}
</style>
