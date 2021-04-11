<template>
	<tippy
		interactive="true"
		placement="top"
		theme="confirm"
		ref="confirm"
		trigger="click"
	>
		<template #trigger>
			<slot />
		</template>
		<a @click.prevent="$emit('confirm')"> Confirm </a>
	</tippy>
</template>
