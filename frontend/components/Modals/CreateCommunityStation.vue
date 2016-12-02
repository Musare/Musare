<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>Create community station</p>
				<button class='delete' @click='toggleModal()'></button>
			</header>
			<section class='modal-card-body'>
				<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
				<label class='label'>Name (lowercase, a-z, used in the url)</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Name...' v-model='$parent.ccs.name'>
				</p>
				<label class='label'>Display name</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Display name...' v-model='$parent.ccs.displayName'>
				</p>
				<label class='label'>Description</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Description...' v-model='$parent.ccs.description'>
				</p>
			</section>
			<footer class='modal-card-foot'>
				<a class='button is-primary' @click='submitModal()'>Create</a>
			</footer>
		</div>
	</div>
</template>

<script>
	export default {
		methods: {
			toggleModal: function () {
				this.$dispatch('toggleModal', 'ccs');
			},
			submitModal: function () {
				this.$dispatch('ccs');
				this.toggleModal();
			}
		}
	}
</script>