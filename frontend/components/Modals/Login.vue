<template>
	<div class="modal is-active">
		<div class="modal-background"></div>
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Login</p>
				<button class="delete" @click="toggleModal()"></button>
			</header>
			<section class="modal-card-body">
				<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
				<label class="label">Email</label>
				<p class="control">
					<input class="input" type="text" placeholder="Email..." v-model="$parent.login.email">
				</p>
				<label class="label">Password</label>
				<p class="control">
					<input class="input" type="password" placeholder="Password..." v-model="$parent.login.password" v-on:keypress="$parent.submitOnEnter(submitModal, $event)">
				</p>
			</section>
			<footer class="modal-card-foot">
				<a class="button is-primary" @click="submitModal('login')">Submit</a>
			</footer>
		</div>
	</div>
</template>

<script>
	export default {
		methods: {
			toggleModal: function () {
				this.$dispatch('toggleModal', 'login');
			},
			submitModal: function () {
				this.$dispatch('login');
				this.toggleModal();
			}
		}
	}
</script>