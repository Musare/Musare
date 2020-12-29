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
		this.getUsernameFromId(this.$props.userId).then(res => {
			if (res) this.username = res;
		});
	},
	methods: {
		...mapActions("user/auth", ["getUsernameFromId"])
	}
};
</script>
