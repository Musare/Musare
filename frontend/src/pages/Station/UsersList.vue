<template>
	<sidebar title="Users">
		<template v-slot:content>
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
		</template>
	</sidebar>
</template>

<script>
import { mapState } from "vuex";

import Sidebar from "../../components/Sidebar.vue";

export default {
	computed: mapState({
		users: state => state.station.users,
		userCount: state => state.station.userCount
	}),
	components: { Sidebar }
};
</script>

<style lang="scss" scoped>
.menu {
	padding: 0 20px;
}

.menu-list li a:hover {
	color: #000 !important;
}
</style>
