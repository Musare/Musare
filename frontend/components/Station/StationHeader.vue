<template>
	<nav class="nav">
		<div class="nav-left">
			<a class="nav-item" href="#" v-link="{ path: '/' }" @click="this.$dispatch('leaveStation', title)">
				<span class="icon">
					<i class="material-icons">home</i>
				</span>
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
					<i class="material-icons left">skip_next</i>
				</span>
			</a>
			<a v-if="$parent.$parent.role !== 'admin' && $parent.$parent.loggedIn" class="nav-item" href="#" @click="$parent.voteSkipStation()">
				<span class="icon">
					<i class="material-icons left">skip_next</i>
				</span>
			</a>
			<a class="nav-item" href="#" v-if="$parent.$parent.role === 'admin' && $parent.locked" @click="$parent.unlockStation()">
				<span class="icon">
					<i class="material-icons left">lock_outline</i>
				</span>
			</a>
			<a class="nav-item" href="#" v-if="$parent.$parent.role === 'admin' && !$parent.locked" @click="$parent.lockStation()">
				<span class="icon">
					<i class="material-icons left">lock_open</i>
				</span>
			</a>
			<a class="nav-item" href="#" v-if="$parent.$parent.role === 'admin' && $parent.paused" @click="$parent.resumeStation()">
				<span class="icon">
					<i class="material-icons left">play_arrow</i>
				</span>
			</a>
			<a class="nav-item" href="#" v-if="$parent.$parent.role === 'admin' && !$parent.paused" @click="$parent.pauseStation()">
				<span class="icon">
					<i class="material-icons left">pause</i>
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
			<a class="nav-item" href="#" @click='$parent.sidebars.playlist = !$parent.sidebars.playlist'>
				<span class="icon">
					<i class="material-icons">queue_music</i>
				</span>
			</a>
			<a class="nav-item" href="#">
				<span class="icon">
					<i class="material-icons">chat</i>
				</span>
			</a>
			<a class="nav-item" href="#">
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
		background-color: $grey-darker;
	}

	a.nav-item {
		color: $white;

		&:hover {
			color: $white;
		}
	}

	.nav-center {
		display: flex;
    	align-items: center;
		text-transform: uppercase;
		color: $blue;
		font-size: 22px;
	}
</style>
