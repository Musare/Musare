<template>
	<nav class="nav is-info">
		<div class="nav-left">
			<a class="nav-item is-brand" href="#" v-link="{ path: '/' }">
				Musare
			</a>
		</div>

		<!--<span class="nav-toggle" :class="{ 'is-active': isActive }" @click="toggleMobileMenu()">
			<span></span>
			<span></span>
			<span></span>
		</span>-->

		<div class="nav-right">
			<a class="nav-item is-tab admin" href="#" v-link="{ path: '/admin' }" v-if="$parent.$parent.role === 'admin'">
				Admin
			</a>
			<a class="nav-item is-tab" href="#">
				About
			</a>
			<a class="nav-item is-tab" href="#" v-link="{ path: '/news' }">
				News
			</a>
			<span class="grouped" v-if="$parent.$parent.loggedIn">
				<a class="nav-item is-tab" href="#" v-link="{ path: '/settings' }">
					Settings
				</a>
				<a class="nav-item is-tab" href="#" @click="$parent.$parent.logout()">
					Logout
				</a>
			</span>
			<span class="grouped" v-else>
				<a class="nav-item" href="#" @click="toggleModal('login')">
					Login
				</a>
				<a class="nav-item" href="#" @click="toggleModal('register')">
					Register
				</a>
			</span>
		</div>
	</nav>
</template>

<script>
	export default {
		methods: {
			toggleModal: function (type) {
				this.$dispatch('toggleModal', type);
			}
		}
	}
</script>

<style lang="scss" scoped>
	@import 'theme.scss';

	.nav {
		background-color: $grey-darker;

		.is-brand {
			font-size: 26px !important;
		}

		.nav-item {
			font-size: 15px;
			color: $white;

			&:hover {
				color: $white;
			}
		}
		.admin {
			color: $blue;
		}
	}
	.grouped {
		margin: 0;
		display: flex;
		text-decoration: none;
	}
</style>
