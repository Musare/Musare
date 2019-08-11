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
	props: ["userId", "link"],
	data() {
		return {
			username: "unknown"
		};
	},
	methods: {
		...mapActions("user/auth", ["getUsernameFromId"])
	},
	mounted() {
		this.getUsernameFromId(this.$props.userId).then(res => {
			if (res) this.username = res;
		});
	}
};
</script>
