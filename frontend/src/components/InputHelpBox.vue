<template>
	<p
		class="help"
		:class="
			entered || entered === undefined
				? valid
					? 'is-success'
					: 'is-danger'
				: 'is-grey'
		"
	>
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
		},
		entered: {
			type: Boolean,
			default: undefined,
			required: false
		}
	}
};
</script>

<style lang="scss" scoped>
.help {
	margin-top: 0 !important;
	margin-bottom: 10px !important;
	font-size: 12px;
}

.is-grey {
	color: var(--dark-grey-1);
}
</style>
