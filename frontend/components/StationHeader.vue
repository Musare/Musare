<template>
	<nav class="nav">
		<div class="nav-left">
			<a class="nav-item" href="#" v-link="{ path: '/' }" @click="this.$dispatch('leaveStation', title)">
				<span class="icon">
					<i class="fa fa-home"></i>
				</span>
			</a>
			<a class="nav-item" href="#" @click="$parent.toggleModal()">
				<span class="icon">
					<i class="fa fa-plus"></i>
				</span>
			</a>
			<a class="nav-item" href="#">
				<span class="icon">
					<i class="fa fa-flag"></i>
				</span>
			</a>
			<a class="nav-item" href="#">
				<span class="icon">
					<i class="fa fa-step-forward"></i>
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
			<a class="nav-item" href="#">
				<span class="icon">
					<i class="fa fa-music"></i>
				</span>
			</a>
			<a class="nav-item" href="#">
				<span class="icon">
					<i class="fa fa-comments"></i>
				</span>
			</a>
			<a class="nav-item" href="#">
				<span class="icon">
					<i class="fa fa-users"></i>
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
