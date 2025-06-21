<script lang="ts" setup>
withDefaults(
	defineProps<{
		is?: string | object;
	}>(),
	{
		is: "div"
	}
);
</script>

<template>
	<component :is="is" class="input_group">
		<slot />
	</component>
</template>

<style lang="less" scoped>
.input_group {
	display: flex;

	:deep(&__expanding) {
		flex-grow: 1;
		min-width: 0;
	}

	& > :deep(.btn) {
		align-self: end;
		border-radius: 0;

		&:first-child:not(:last-child) {
			border-radius: 5px 0 0 5px;
		}

		&:last-child:not(:first-child) {
			border-radius: 0 5px 5px 0;
		}
	}

	& > :deep(.inpt) {
		.inpt__input {
			border-radius: 0;
		}

		&:first-child:not(:last-child) .inpt__input {
			border-radius: 5px 0 0 5px;
		}

		&:last-child:not(:first-child) .inpt__input {
			border-radius: 0 5px 5px 0;
		}

		&:not(:first-child) .inpt__label {
			padding-left: 5px;
			border-left: solid 1px var(--light-grey-1);
		}

		&:not(:last-child) .inpt__input {
			border-right-width: 0;
		}
	}
}
</style>
