<template>
	<div class="modal" :class="{ 'is-active': isActive }">
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
					<input class="input" type="text" placeholder="Email..." v-model="$parent.$parent.login.email">
				</p>
				<label class="label">Password</label>
				<p class="control">
					<input class="input" type="password" placeholder="Password..." v-model="$parent.$parent.login.password">
				</p>
			</section>
			<footer class="modal-card-foot">
				<a class="button is-primary" @click="submitModal()">Submit</a>
			</footer>
		</div>
	</div>
</template>

<script>
	export default {
		data() {
			return { isActive: false }
		},
		methods: {
			toggleModal: function () {
				this.isActive = !this.isActive;
			},
			submitModal: function () {
				this.$dispatch('login');
				this.toggleModal();
			}
		}
	}
</script>