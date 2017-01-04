<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>Login</p>
				<button class='delete' @click='toggleModal()'></button>
			</header>
			<section class='modal-card-body'>
				<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
				<label class='label'>Email</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Email...' v-model='$parent.login.email'>
				</p>
				<label class='label'>Password</label>
				<p class='control'>
					<input class='input' type='password' placeholder='Password...' v-model='$parent.login.password' v-on:keypress='$parent.submitOnEnter(submitModal, $event)'>
				</p>
				<p>By logging in/registering you agree to our <a href="/terms" v-link="{ path: '/terms' }">Terms of Service</a> and <a href="/privacy" v-link="{ path: '/privacy' }">Privacy Policy</a>.</p>
			</section>
			<footer class='modal-card-foot'>
				<a class='button is-primary' href='#' @click='submitModal("login")'>Submit</a>
				<a class='button is-github' :href='$parent.serverDomain + "/auth/github/authorize"'>
					<div class='icon'>
						<img class='invert' src='/assets/social/github.svg'/>
					</div>
					&nbsp;&nbsp;Login with GitHub
				</a>
				<a href='#' @click='resetPassword()'>Forgot password?</a>
			</footer>
		</div>
	</div>
</template>

<script>
	export default {
		methods: {
			toggleModal: function () {
				if (this.$router._currentRoute.path === '/login') {
					location.href = '/';
				} else {
					this.$dispatch('toggleModal', 'login');
				}
			},
			submitModal: function () {
				this.$dispatch('login');
				this.toggleModal();
			},
			resetPassword: function () {
				this.toggleModal();
				this.$router.go('/reset_password');
			}
		},
		events: {
			closeModal: function() {
				this.$dispatch('toggleModal', 'login');
			}
		}
	}
</script>

<style type='scss' scoped>
	.button.is-github {
		background-color: #333;
		color: #fff !important;
	}

	.is-github:focus { background-color: #1a1a1a; }
	.is-primary:focus { background-color: #029ce3 !important; }

	.invert { filter: brightness(5); }
</style>