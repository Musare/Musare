<template>
	<div class="sidebar" transition="slide">
		<div class="inner-wrapper">
			<div class="title">
				Users
			</div>
			<h5 class="center">Total users: {{ userCount }}</h5>
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

.sidebar {
	position: fixed;
	z-index: 1;
	top: 0;
	right: 0;
	width: 300px;
	height: 100vh;
	background-color: $white;
	box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16),
		0 2px 10px 0 rgba(0, 0, 0, 0.12);
}

.inner-wrapper {
	top: 60px;
	position: relative;
}

.slide-transition {
	transition: transform 0.6s ease-in-out;
	transform: translateX(0);
}

.slide-enter,
.slide-leave {
	transform: translateX(100%);
}

.title {
	background-color: rgb(3, 169, 244);
	text-align: center;
	padding: 10px;
	color: $white;
	font-weight: 600;
}

.menu {
	padding: 0 20px;
}

.menu-list li a:hover {
	color: #000 !important;
}
</style>
