<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>Register</p>
				<button class='delete' @click='toggleModal()'></button>
			</header>
			<section class='modal-card-body'>
				<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
				<label class='label'>Email</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Email...' v-model='$parent.register.email'>
				</p>
				<label class='label'>Username</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Username...' v-model='$parent.register.username'>
				</p>
				<label class='label'>Password</label>
				<p class='control'>
					<input class='input' type='password' placeholder='Password...' v-model='$parent.register.password' v-on:keypress='$parent.submitOnEnter(submitModal, $event)'>
				</p>
				<div id="recaptcha"></div>
				<p>By logging in you agree to our <a href="/terms" v-link="{ path: '/terms' }">Terms of Service</a> and <a href="/privacy" v-link="{ path: '/privacy' }">Privacy Policy</a>.</p>
			</section>
			<footer class='modal-card-foot'>
				<a class='button is-primary' @click='submitModal()'>Submit</a>
				<a class='button is-github' :href='$parent.serverDomain + "/auth/github/authorize"'>
					<i class='fa fa-github' aria-hidden='true'></i>
					&nbsp;&nbsp;Register with GitHub
				</a>
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
			lofig.get('recaptcha', function (obj) {
				_this.recaptcha.key = obj.key;
				grecaptcha.render('recaptcha', {
					'sitekey' : _this.recaptcha.key
				});
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
		},
		events: {
			closeModal: function() {
				this.$dispatch('toggleModal', 'register');
			}
		}
	}
</script>

<style type='scss' scoped>
	.button.is-github {
		background-color: #333 !important;
		color: #fff !important;
	}
</style>