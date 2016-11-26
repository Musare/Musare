<template>
	<div class="modal is-active">
		<div class="modal-background"></div>
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Register</p>
				<button class="delete" @click="toggleModal()"></button>
			</header>
			<section class="modal-card-body">
				<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
				<label class="label">Email</label>
				<p class="control">
					<input class="input" type="text" placeholder="Email..." v-model="$parent.register.email">
				</p>
				<label class="label">Username</label>
				<p class="control">
					<input class="input" type="text" placeholder="Username..." v-model="$parent.register.username">
				</p>
				<label class="label">Password</label>
				<p class="control">
					<input class="input" type="password" placeholder="Password..." v-model="$parent.register.password">
				</p>
				<div class="g-recaptcha" :data-sitekey="recaptcha.key"></div>
			</section>
			<footer class="modal-card-foot">
				<a class="button is-primary" @click="submitModal('register')">Submit</a>
			</footer>
		</div>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				recaptcha: {
					key: ''
				}
			}
		},
		ready: function () {
			let _this = this;
			lofig.get('recaptcha.key', function (key) {
				_this.recaptcha.key = key;
			});
		},
		methods: {
			toggleModal: function () {
				this.$dispatch('toggleModal', 'register');
			},
			submitModal: function () {
				this.$dispatch('register');
				this.toggleModal();
			}
		}
	}
</script>