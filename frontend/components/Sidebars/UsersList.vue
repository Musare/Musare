<template>
	<div class="sidebar" transition="slide">
		<div class="inner-wrapper">
			<div class="sidebar-title">Users</div>
			<h5 class="has-text-centered">Total users: {{ userCount }}</h5>
			<aside class="menu">
				<ul class="menu-list">
					<li v-for="(username, index) in users" :key="index">
						<router-link
							:to="{ name: 'profile', params: { username } }"
							target="_blank"
						>
							{{ username }}
						</router-link>
					</li>
				</ul>
			</aside>
		</div>
	</div>
</template>

<script>
import { mapState } from "vuex";

export default {
	computed: mapState({
		users: state => state.station.users,
		userCount: state => state.station.userCount
	})
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.night-mode {
	.sidebar {
		background-color: $night-mode-secondary;

		.sidebar-title {
			color: #fff;
		}

		* {
			color: #ddd;
		}
	}
}

.sidebar-title {
	background-color: rgb(3, 169, 244);
	text-align: center;
	padding: 10px;
	color: $white;
	font-weight: 600;
	font-size: 20px;
}

.menu {
	padding: 0 20px;
}

.menu-list li a:hover {
	color: #000 !important;
}
</style>
