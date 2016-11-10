<template>
	<div class="app">
		<main-header></main-header>
		<div class="modal" :class="{ 'is-active': isRegisterActive }">
			<div class="modal-background"></div>
			<div class="modal-card">
				<header class="modal-card-head">
					<p class="modal-card-title">Register</p>
					<button class="delete" @click="toggleModal('register')"></button>
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
					<div class="g-recaptcha" data-sitekey="6Lfa-wYUAAAAANY6iVvWNEXohC38l1cZqHRole9T"></div>
				</section>
				<footer class="modal-card-foot">
					<a class="button is-primary" @click="submitModal('register')">Submit</a>
				</footer>
			</div>
		</div>
		<div class="modal" :class="{ 'is-active': isLoginActive }">
			<div class="modal-background"></div>
			<div class="modal-card">
				<header class="modal-card-head">
					<p class="modal-card-title">Login</p>
					<button class="delete" @click="toggleModal('login')"></button>
				</header>
				<section class="modal-card-body">
					<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
					<label class="label">Email</label>
					<p class="control">
						<input class="input" type="text" placeholder="Email..." v-model="$parent.login.email">
					</p>
					<label class="label">Password</label>
					<p class="control">
						<input class="input" type="password" placeholder="Password..." v-model="$parent.login.password">
					</p>
				</section>
				<footer class="modal-card-foot">
					<a class="button is-primary" @click="submitModal('login')">Submit</a>
				</footer>
			</div>
		</div>
		<div class="group">
			<!--<div class="group-title">{{group.name}}</div>-->
			<div class="group-stations">
				<div class="stations-station" v-for="station in $parent.stations" v-link="{ path: '/station/' + station.id }" @click="this.$dispatch('joinStation', station.id)">
					<img class="station-image" :src="station.playlist[station.currentSongIndex].thumbnail" />
					<div class="station-info">
						<div class="station-grid-left">
							<h3>{{ station.displayName }}</h3>
							<p>{{ station.description }}</p>
						</div>
						<div class="station-grid-right">
							<div>{{ station.users }}&nbsp;&nbsp;<i class="fa fa-user" aria-hidden="true"></i></div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<main-footer></main-footer>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue'
	import MainFooter from '../MainFooter.vue'

	export default {
		data() {
			return {
				isRegisterActive: false,
				isLoginActive: false
			}
		},
		methods: {
			toggleModal: function(type) {
				switch(type) {
					case 'register':
						this.isRegisterActive = !this.isRegisterActive;
						break;
					case 'login':
						this.isLoginActive = !this.isLoginActive;
						break;
				}
			},
			submitModal: function(type) {
				switch(type) {
					case 'register':
						this.$dispatch('register');
						this.toggleModal('register');
						break;
					case 'login':
						this.$dispatch('login');
						this.toggleModal('login');
						break;
				}
			}
		},
		components: { MainHeader, MainFooter }
	}
</script>

<style lang="scss">

	@import 'theme.scss';

	* { box-sizing: border-box; font-family: Roboto, sans-serif; }

	html {
		width: 100%;
		height: 100%;
		color: rgba(0, 0, 0, 0.87);

		body {
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
		}
	}

	@media only screen and (min-width: 1200px) {
		html {
			font-size: 15px;
		}
	}

	@media only screen and (min-width: 992px) {
		html {
			font-size: 14.5px;
		}
	}

	@media only screen and (min-width: 0) {
		html {
			font-size: 14px;
		}
	}

	.label {
		display: flex;
	}

	.g-recaptcha {
		display: flex;
		justify-content: center;
		margin-top: 20px;
	}

	.group {
		width: 100%;
		height: 448px;
		margin: 64px 0 0 0;

		.group-title {
			float: left;
			clear: none;
			width: 100%;
			height: 64px;
			line-height: 48px;
			text-align: center;
			font-size: 48px;
		}

		.group-stations {
			white-space: nowrap;
			text-align: center;
			overflow: hidden;
			float: left;
			clear: none;
			width: 100%;
			height: 400px;

			.stations-station {
				position: relative;
				top: 16px;
				display: inline-block;
				clear: none;
				width: 256px;
				height: 370px;
				margin: 0 16px 0 16px;
				box-shadow: 0 1px 6px 2px rgba(0, 0, 0, 0.25);
				cursor: pointer;

				.station-info {
					display: flex;
					flex-direction: row;
					align-items: center;
				}

				.station-image {
					width: 100%;
					height: 256px;
					object-fit: cover;
				}

				.station-grid-left {
					display: flex;
					flex-direction: column;
					width: 75%;
					text-align: left;
					padding-left: 10px;

					h3 {
						color: $blue;
						margin: 0;
						white-space: normal;
						padding-top: 10px;
					}

					p {
						margin: 0;
						white-space: normal;
						padding-top: 10px;
					}
				}

				.station-grid-right {
					display: flex;
					flex-direction: column;
					width: 25%;
					i {
						color: $blue;
					}
				}
			}
		}
	}
</style>
