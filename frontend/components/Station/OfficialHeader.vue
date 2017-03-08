<template>
	<nav class='nav'>
		<div class='nav-left'>
			<a class='nav-item logo' href='#' v-link='{ path: "/" }' @click='this.$dispatch("leaveStation", title)'>
				Musare
			</a>
		</div>

		<div class='nav-center stationDisplayName'>
			{{ $parent.station.displayName }}
		</div>

		<span class="nav-toggle" :class="{ 'is-active': isMobile }" @click="isMobile = !isMobile">
			<span></span>
			<span></span>
			<span></span>
		</span>

		<div class="nav-right nav-menu" :class="{ 'is-active': isMobile }">
			<!-- DUPLICATE BUTTON TO HOLD FORMATTING -->
			<a class='nav-item' href='#' @click='$parent.toggleSidebar("songslist")'>
				<span class='icon'>
					<i class='material-icons'>queue_music</i>
				</span>
			</a>
		</div>
	</nav>
	<div class="admin-sidebar">
		<div class='inner-wrapper'>
			<hr class="sidebar-top-hr">
			<div v-if='isOwner()'>
				<a class="sidebar-item" href='#' v-if='isOwner()' @click='$parent.editStation()'>
					<span class='icon'>
						<i class='material-icons'>settings</i>
					</span>
					<span class="icon-purpose">Station settings</span>
				</a>
				<a v-if='isOwner()' class="sidebar-item" href='#' @click='$parent.skipStation()'>
					<span class='icon'>
						<i class='material-icons'>skip_next</i>
					</span>
					<span class="icon-purpose">Skip current song</span>
				</a>
				<a class="sidebar-item" href='#' v-if='isOwner() && !$parent.paused' @click='$parent.pauseStation()'>
					<span class='icon'>
						<i class='material-icons'>pause</i>
					</span>
					<span class="icon-purpose">Pause station</span>
				</a>
				<a class="sidebar-item" href='#' v-if='isOwner() && $parent.paused' @click='$parent.resumeStation()'>
					<span class='icon'>
						<i class='material-icons'>play_arrow</i>
					</span>
					<span class="icon-purpose">Resume station</span>
				</a>
				<hr>
			</div>
			<div v-if="$parent.$parent.loggedIn">
				<a class="sidebar-item" href='#' @click='$parent.modals.addSongToQueue = !$parent.modals.addSongToQueue' v-if='$parent.type === "official" && $parent.$parent.loggedIn'>
					<span class='icon'>
						<i class='material-icons'>queue</i>
					</span>
					<span class="icon-purpose">Add song to queue</span>
				</a>
				<a v-if='!isOwner() && $parent.$parent.loggedIn && !$parent.noSong' class="sidebar-item" href='#' @click='$parent.voteSkipStation()'>
					<span class='icon'>
						<i class='material-icons'>skip_next</i>
					</span>
					<span class="skip-votes">{{$parent.currentSong.skipVotes}}</span>
					<span class="icon-purpose">Skip current song</span>
				</a>
				<a v-if='$parent.$parent.loggedIn && !$parent.noSong && !$parent.simpleSong' class="sidebar-item" href='#' @click='$parent.modals.report = !$parent.modals.report'>
					<span class='icon'>
						<i class='material-icons'>report</i>
					</span>
					<span class="icon-purpose">Report a song</span>
				</a>
				<a v-if='$parent.$parent.loggedIn && !$parent.noSong' class="sidebar-item" href='#' @click='$parent.modals.addSongToPlaylist = true'>
					<span class='icon'>
						<i class='material-icons'>playlist_add</i>
					</span>
					<span class="icon-purpose">Add current song to playlist</span>
				</a>
				<hr>
			</div>
			<a class="sidebar-item" href='#' @click='$parent.toggleSidebar("songslist")'>
				<span class='icon'>
					<i class='material-icons'>queue_music</i>
				</span>
				<span class="icon-purpose">Show the station queue</span>
			</a>
			<a class="sidebar-item" href='#' @click='$parent.toggleSidebar("users")'>
				<span class='icon'>
					<i class='material-icons'>people</i>
				</span>
				<span class="icon-purpose">Display users in the station</span>
			</a>
		</div>
	</div>
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
				return this.$parent.$parent.loggedIn && this.$parent.$parent.role === 'admin';
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

	.hidden {
		display: none;
	}

	.admin-sidebar {
		position: fixed;
		z-index: 1;
		top: 0;
		left: 0;
		width: 64px;
		height: 100vh;
		background-color: #03a9f4;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
		overflow-y: auto;
		overflow-x: hidden;
	}

	.inner-wrapper {
		top: 64px;
		position: relative;
	}

	.admin-sidebar .material-icons {
		width: 100%;
		font-size: 2rem;
	}
	.admin-sidebar .sidebar-item {
		font-size: 2rem;
		height: 50px;
		color: white;
		-webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-flex: 0;
    -ms-flex-positive: 0;
    flex-grow: 0;
    -ms-flex-negative: 0;
    flex-shrink: 0;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    justify-content: center;
		width: 100%;
		position: relative;
	}
	.admin-sidebar .sidebar-top-hr {
		margin: 0 0 20px 0;
	}

	.sidebar-item .icon-purpose {
		visibility: hidden;
		width: 150px;
		font-size: 12px;
		background-color: rgba(3, 169, 244,0.8);
		color: #fff;
		text-align: center;
		border-radius: 6px;
		padding: 5px 0;
		position: absolute;
		z-index: 1;
		left: 105%;
	}

	.sidebar-item:hover .icon-purpose {
		visibility: visible;
	}
</style>
