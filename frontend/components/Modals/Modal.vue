<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>{{ title }}</p>
				<button class='delete' @click='$parent.$parent.modals[this.type] = !$parent.$parent.modals[this.type]'></button>
			</header>
			<section class='modal-card-body'>
				<slot name='body'></slot>
			</section>
			<footer class='modal-card-foot' v-if='_slotContents["footer"] != null'>
				<slot name='footer'></slot>
			</footer>
		</div>
	</div>
</template>

<script>
	export default {
		props: {
			title: { type: String }
		},
		methods: {
			toCamelCase: str => {
				return str.toLowerCase()
					.replace(/[-_]+/g, ' ')
					.replace(/[^\w\s]/g, '')
					.replace(/ (.)/g, function($1) { return $1.toUpperCase(); })
					.replace(/ /g, '');
			}
		},
		ready: function () {
			this.type = this.toCamelCase(this.title);
		}
	}
</script>
