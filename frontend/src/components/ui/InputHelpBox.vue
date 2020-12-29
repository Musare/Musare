<template>
	<p class="help" :class="valid ? 'is-success' : 'is-danger'">
		{{ message }}
	</p>
</template>

<script>
export default {
	props: {
		message: {
			type: String,
			required: true
		},
		valid: {
			type: Boolean,
			required: true
		}
	},
	data() {
		return {};
	},
	methods: {}
};
</script>

<style lang="scss" scoped>
.help {
	margin-top: 0 !important;
	margin-bottom: 5px !important;
	font-size: 12px;
}
</style>
