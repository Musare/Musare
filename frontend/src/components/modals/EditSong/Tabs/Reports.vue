<template>
	<div class="reports-tab">
		Reports will display here
	</div>
</template>

<script>
import { mapState, mapGetters /* , mapActions */ } from "vuex";

// import Toast from "toasters";

export default {
	data() {
		return {};
	},
	computed: {
		...mapState("modals/editSong", {
			reports: state => state.reports
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {}
	// methods: {
	// 	...mapActions("modals/editSong", ["selectDiscogsInfo"])
	// }
};
</script>

<style lang="scss" scoped></style>
