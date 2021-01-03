<template>
	<div id="users">
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
@import "../../../../styles/global.scss";

.night-mode {
	#users {
		background-color: #222 !important;
		border: 0 !important;
	}

	a {
		color: #ddd;
	}
}

#users {
	background-color: #fff;
	border: 1px solid $light-grey-2;
	margin-bottom: 20px;
	padding: 10px;
	border-radius: 0 0 5px 5px;

	.menu-list li a:hover {
		color: #000 !important;
	}
}
</style>
