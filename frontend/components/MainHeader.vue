<template>
	<nav class="nav is-info">
		<div class="nav-left">
			<a class="nav-item is-brand" href="#" v-link="{ path: '/' }">
				Musare
			</a>
		</div>

		<span class="nav-toggle" :class="{ 'is-active': isMobile }" @click="isMobile = !isMobile">
			<span></span>
			<span></span>
			<span></span>
		</span>

		<div class="nav-right nav-menu" :class="{ 'is-active': isMobile }">
			<a class="nav-item is-tab admin" href="#" v-link="{ path: '/admin' }" v-if="$parent.$parent.role === 'admin'">
				<strong>Admin</strong>
			</a>
			<!--a class="nav-item is-tab" href="#">
				About
			</a-->
			<a class="nav-item is-tab" href="#" v-link="{ path: '/team' }">
				Team
			</a>
			<a class="nav-item is-tab" href="#" v-link="{ path: '/news' }">
				News
			</a>
			<span class="grouped" v-if="$parent.$parent.loggedIn">
				<a class="nav-item is-tab" href="#" v-link="{ path: '/u/' + $parent.$parent.username }">
					Profile
				</a>
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
		data() {
			return {
				isMobile: false
			}
		},
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
		background-color: #03a9f4;
		height: 64px;

		.nav-menu.is-active {
			.nav-item {
				color: #333;

				&:hover {
					color: #333;
				}
			}
		}

		.nav-toggle {
			height: 64px;

			&.is-active span {
				background-color: #333;
			}
		}

		.is-brand {
			font-size: 2.1rem !important;
			line-height: 64px !important;
			padding: 0 20px;
		}

		.nav-item {
			font-size: 15px;
			color: $white;

			&:hover {
				color: $white;
			}
		}
		.admin {
			color: #424242;
		}
	}
	.grouped {
		margin: 0;
		display: flex;
		text-decoration: none;
	}
</style>
