<template>
	<router-link
		v-if="$props.link && username"
		:to="{ path: `/u/${userIdMap['Z' + $props.userId]}` }"
	>
		{{ username ? username : "unknown" }}
	</router-link>
	<span v-else>
		{{ username ? username : "unknown" }}
	</span>
</template>

<script>
import { mapState, mapActions } from "vuex";

export default {
	props: ["userId", "link"],
	data: function() {
		return {
			username: ""
		};
	},
	computed: {
		...mapState("user/auth", {
			userIdMap: state => state.userIdMap
		})
	},
	methods: {
		...mapActions("user/auth", ["getUsernameFromId"])
	},
	mounted: function() {
		this.getUsernameFromId(this.$props.userId).then(res => {
			this.username = res;
		});
	}
};
</script>
