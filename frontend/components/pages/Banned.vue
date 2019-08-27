<template>
	<div class="container">
		<metadata title="Banned" />
		<i class="material-icons">not_interested</i>
		<h4>
			You are banned for
			<strong>{{
				formatDistance(new Date(ban.expiresAt), Date.now())
			}}</strong>
		</h4>
		<h5 class="reason">
			<strong>Reason: </strong>
			{{ ban.reason }}
		</h5>
	</div>
</template>
<script>
import { mapState } from "vuex";
import { formatDistance } from "date-fns"; // eslint-disable-line no-unused-vars

export default {
	computed: mapState({
		ban: state => state.user.auth.ban
	}),
	methods: { formatDistance }
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.container {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	height: 100vh;
	max-width: 1000px;
	padding: 0 20px;
}

.reason {
	text-align: justify;
}

i.material-icons {
	cursor: default;
	font-size: 65px;
	color: tomato;
}
</style>
