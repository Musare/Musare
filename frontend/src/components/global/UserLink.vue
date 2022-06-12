<template>
	<router-link
		v-if="$props.link && user.username"
		:to="{ path: `/u/${user.username}` }"
		:title="userId"
	>
		{{ user.name }}
	</router-link>
	<span v-else :title="userId">
		{{ user.name }}
	</span>
</template>

<script>
import { mapActions } from "vuex";

export default {
	props: {
		userId: { type: String, default: "" },
		link: { type: Boolean, default: true }
	},
	data() {
		return {
			user: {
				name: "Unknown",
				username: null
			}
		};
	},
	mounted() {
		this.getBasicUser(this.$props.userId).then(user => {
			if (user)
				this.user = {
					name: user.name,
					username: user.username
				};
		});
	},
	methods: {
		...mapActions("user/auth", ["getBasicUser"])
	}
};
</script>

<style lang="less" scoped>
a {
	color: var(--primary-color);
	&:hover,
	&:focus {
		filter: brightness(90%);
	}
}
</style>
