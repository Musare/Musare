<template>
	<tippy
		interactive="true"
		placement="top"
		theme="confirm"
		ref="confirm"
		trigger="click"
	>
		<template #trigger>
			<div @click.shift="$emit('confirm')">
				<slot />
			</div>
		</template>
		<a @click.prevent="$emit('confirm')"> Confirm </a>
	</tippy>
</template>
