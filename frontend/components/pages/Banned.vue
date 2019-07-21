<template>
	<div class="container">
		<i class="material-icons">not_interested</i>
		<h4>
			You are banned for
			<strong>{{ moment($parent.ban.expiresAt).fromNow(true) }}</strong>
		</h4>
		<h5 class="reason">
			<strong>Reason: </strong>
			{{ $parent.ban.reason }}
		</h5>
	</div>
</template>
<script>
export default {
	data() {
		return {
			moment
		};
	}
};
</script>

<style lang="scss" scoped>
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
