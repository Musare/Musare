<template>
	<div class="app">
		<main-header></main-header>
		<toast>
			Test
		</toast>
		<div class="modal fade" id="register" tabindex="-1" role="dialog" aria-labelledby="register-modal">
			<div class="modal-dialog" role="document">
				<div class="modal-content">
					<div class="modal-header">
						<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
						<h5 class="modal-title">Register</h5>
					</div>
					<div class="modal-body">
						<input class="form-control" type="text" placeholder="Email..." v-model="$parent.register.email"/>
						<input class="form-control" type="text" placeholder="Username..." v-model="$parent.register.username"/>
						<input class="form-control" type="password" placeholder="Password..." v-model="$parent.register.password"/>
						<div class="g-recaptcha" data-sitekey="6LdNCQcUAAAAANj_w5leQSrxnAmDp2ioh4alkUHg"></div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-primary" data-dismiss="modal" @click="this.$dispatch('register');">Submit</button>
					</div>
				</div>
			</div>
		</div>
		<div class="modal fade" id="login" tabindex="-1" role="dialog" aria-labelledby="login-modal">
			<div class="modal-dialog" role="document">
				<div class="modal-content">
					<div class="modal-header">
						<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
						<h5 class="modal-title">Login</h5>
					</div>
					<div class="modal-body">
						<input class="form-control" type="text" placeholder="Email..." v-model="$parent.login.email"/>
						<input class="form-control" type="password" placeholder="Password..." v-model="$parent.login.password"/>
						<hr />
						<a class="btn btn-block btn-default btn-github" href="/users/github"><i class="fa fa-github"></i> Login with GitHub</a>
						<a class="btn btn-block btn-default btn-discord" href="/users/discord">Login with Discord</a>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-primary" data-dismiss="modal" @click="this.$dispatch('login');">Submit</button>
					</div>
				</div>
			</div>
		</div>
		<div class="group" v-for="group in $parent.groups">
			<div class="group-title">{{group.name}}</div>
			<div class="group-rooms">
				<div class="rooms-room" v-for="room in group.rooms" v-link="{ path: '/station' }">
					<img class="room-image" :src="room.thumbnail" />
					<div class="room-info">
						<div class="room-grid-left">
							<h3>{{ room.name }}</h3>
							<p>{{ room.description }}</p>
						</div>
						<div class="room-grid-right">
							<div>{{ room.users }}&nbsp;&nbsp;<i class="fa fa-user" aria-hidden="true"></i></div>
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
	import Toast from '../Toast.vue';

	export default {
		components: { MainHeader, MainFooter, Toast }
	}
</script>

<style lang="sass">
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

		.g-recaptcha {
			display: flex;
			justify-content: center;
			margin-top: 10px;
	}

		.group {
			width: 100%;
			height: 448px;
			margin: 64px 0 64px 0;

			.group-title {
				float: left;
				clear: none;
				width: 100%;
				height: 64px;
				line-height: 48px;
				text-align: center;
				font-size: 48px;
		}

		.group-rooms {
			white-space: nowrap;
			text-align: center;
			overflow: hidden;
			float: left;
			clear: none;
			width: 100%;
			height: 400px;

			.rooms-room {
				position: relative;
				top: 16px;
				display: inline-block;
				clear: none;
				width: 256px;
				height: 370px;
				margin: 0 16px 0 16px;
				box-shadow: 0 1px 6px 2px rgba(0, 0, 0, 0.25);
				cursor: pointer;

				.room-info {
					display: flex;
					flex-direction: row;
					align-items: center;
				}

				.room-image {
					width: 100%;
					height: 256px;
				}

				.room-grid-left {
					display: flex;
					flex-direction: column;
					width: 75%;
					text-align: left;
					padding-left: 10px;

					h3, p {
						margin: 0;
						white-space: normal;
						padding-top: 10px;
					}
				}

				.room-grid-right {
					display: flex;
					flex-direction: column;
					width: 25%;
				}
			}
		}
	}

	.btn-github {
		background-color: #333;
		color: #fff;
		border: 0;

		&:hover, &:active, &:focus {
			background-color: darken(#333, 5%);
			color: #fff;
		}
	}

	.btn-discord {
		background-color: #7289DA;
		color: #fff;
		border: 0;

		&:hover, &:active, &:focus {
			background-color: darken(#7289DA, 5%);
			color: #fff;
		}
	}
</style>
