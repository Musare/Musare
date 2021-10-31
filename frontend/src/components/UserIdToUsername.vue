<template>
	<router-link
		v-if="$props.link && username !== 'unknown'"
		:to="{ path: `/u/${username}` }"
		:title="userId"
	>
		{{ username }}
	</router-link>
	<span :title="userId" v-else>
		{{ username }}
	</span>
</template>

<script>
import { mapActions } from "vuex";

export default {
	props: {
		userId: { type: String, default: "" },
		link: Boolean
	},
	data() {
		return {
			username: "unknown"
		};
	},
	mounted() {
		this.getUsernameFromId(this.$props.userId).then(username => {
			if (username) this.username = username;
		});
	},
	methods: {
		...mapActions("user/auth", ["getUsernameFromId"])
	}
};
</script>

<style lang="scss" scoped>
a {
	color: var(--primary-color);
	&:hover,
	&:focus {
		filter: brightness(90%);
	}
}
</style>
