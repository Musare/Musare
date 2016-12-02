<template>
	<nav class="nav">
		<div class="nav-left">
			<a class="nav-item logo" href="#" v-link="{ path: '/' }" @click="this.$dispatch('leaveStation', title)">
				Musare
			</a>
			<a class="nav-item" href="#" @click="$parent.toggleModal()">
				<span class="icon">
					<i class="material-icons">playlist_add</i>
				</span>
			</a>
			<a class="nav-item" href="#">
				<span class="icon">
					<i class="material-icons">flag</i>
				</span>
			</a>
			<a v-if="$parent.$parent.role === 'admin'" class="nav-item" href="#" @click="$parent.skipStation()">
				<span class="icon">
					<i class="material-icons">skip_next</i>
				</span>
			</a>
			<a v-if="$parent.$parent.role !== 'admin' && $parent.$parent.loggedIn" class="nav-item" href="#" @click="$parent.voteSkipStation()">
				<span class="icon">
					<i class="material-icons">skip_next</i>
				</span>
			</a>
			<a class="nav-item" href="#" v-if="$parent.$parent.role === 'admin' && $parent.locked" @click="$parent.unlockStation()">
				<span class="icon">
					<i class="material-icons">lock_outline</i>
				</span>
			</a>
			<a class="nav-item" href="#" v-if="$parent.$parent.role === 'admin' && !$parent.locked" @click="$parent.lockStation()">
				<span class="icon">
					<i class="material-icons">lock_open</i>
				</span>
			</a>
			<a class="nav-item" href="#" v-if="$parent.$parent.role === 'admin' && $parent.paused" @click="$parent.resumeStation()">
				<span class="icon">
					<i class="material-icons">play_arrow</i>
				</span>
			</a>
			<a class="nav-item" href="#" v-if="$parent.$parent.role === 'admin' && !$parent.paused" @click="$parent.pauseStation()">
				<span class="icon">
					<i class="material-icons">pause</i>
				</span>
			</a>
		</div>

		<div class="nav-center">
			{{title}}
		</div>

		<!--<span class="nav-toggle" :class="{ 'is-active': isActive }" @click="toggleMobileMenu()">
			<span></span>
			<span></span>
			<span></span>
		</span>-->

		<div class="nav-right">
			<a class="nav-item" href="#" @click='$parent.sidebars.queue = !$parent.sidebars.queue'>
				<span class="icon">
					<i class="material-icons">queue_music</i>
				</span>
			</a>
			<!--<a class="nav-item" href="#">
				<span class="icon">
					<i class="material-icons">chat</i>
				</span>
			</a>-->
			<a class="nav-item" href="#" @click='$parent.sidebars.users = !$parent.sidebars.users'>
				<span class="icon">
					<i class="material-icons">people</i>
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
				isActive: false
			}
		},
		methods: {
			toggleMobileMenu: function() {
				this.isActive = !this.isActive;
			}
		}
	}
</script>

<style lang="scss" scoped>
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
</style>
