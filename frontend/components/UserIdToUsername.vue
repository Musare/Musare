<template>
	<a v-if="$props.link" v-bind:href="`/u/${userIdMap['Z' + $props.userId]}`">
		{{ userIdMap["Z" + $props.userId] }}
	</a>
	<span v-else>
		{{ userIdMap["Z" + $props.userId] }}
	</span>
</template>

<script>
import { mapState, mapActions } from "vuex";

export default {
	components: {},
	props: ["userId", "link"],
	data() {
		return {};
	},
	computed: {
		...mapState("user/userIdMap", {
			userIdMap: state => state.userIdMap
		})
	},
	methods: {
		...mapActions("user/userIdMap", ["getUsernameFromId"])
	},
	mounted: function() {
		this.getUsernameFromId(this.$props.userId).then(() => {
			this.$forceUpdate();
		});
	}
};
</script>
