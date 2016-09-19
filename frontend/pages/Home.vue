<template>
	<div class="app">
		<main-header></main-header>
		<div class="modal fade" id="register" tabindex="-1" role="dialog" aria-labelledby="register-modal">
			<div class="modal-dialog" role="document">
				<div class="modal-content">
					<div class="modal-header">
						<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
						<h4 class="modal-title">Register</h4>
					</div>
					<div class="modal-body">
						<input class="form-control" type="text" placeholder="Email..." v-model="register.email"/>
						<input class="form-control" type="text" placeholder="Username..." v-model="register.username"/>
						<input class="form-control" type="password" placeholder="Password..." v-model="register.password"/>
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
						<h4 class="modal-title">Login</h4>
					</div>
					<div class="modal-body">
						<input class="form-control" type="text" placeholder="Email..." v-model="login.email"/>
						<input class="form-control" type="password" placeholder="Password..." v-model="login.password"/>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-primary" data-dismiss="modal" @click="this.$dispatch('login');">Submit</button>
					</div>
				</div>
			</div>
		</div>
		<div class="group" v-for="group in groups">
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
	import MainHeader from '../components/MainHeader.vue'
	import MainFooter from '../components/MainFooter.vue'

	export default {
		data() {
			return {
				home: {
					visible: true
				},
				station: {
					visible: false
				},
				register: {
					email: "",
					username: "",
					password: ""
				},
				login: {
					email: "",
					password: ""
				},
				loggedIn: true,
				groups: [
					{
						id: "lu08gw56571r4497wrk9",
						name: "Official Rooms",
						rooms: [
							{ id: "73qvw65746acvo8yqfr", thumbnail: "https://lh6.googleusercontent.com/-ghASz3s6yL4/AAAAAAAAAAI/AAAAAAAAALc/tFblPp2myu0/s0-c-k-no-ns/photo.jpg", name: "Country", description: "Johnny Cash - I Walk The Line", users: 10 },
							{ id: "enxcysmhn1k7ld56ogvi", thumbnail: "http://66.media.tumblr.com/1734069af425e491fae7deae0a19869f/tumblr_o0i0xmIYrF1v421f2o1_1280.jpg", name: "Pop", description: "Sia - Cheap Thrills", users: 14 },
							{ id: "kqa99gbva7lij05dn29", thumbnail: "http://www.youredm.com/wp-content/uploads/2014/09/taking-you-higher.jpg", name: "Chill", description: "MrSuicideSheep - Taking you higher", users: 13 },
							{ id: "w19hu791iiub6wmjf9a4i", thumbnail: "http://edmsauce.wpengine.netdna-cdn.com/wp-content/uploads/2012/12/Deadmau5-album-title-goes-here.jpg", name: "EDM", description: "Deadmau5 - There Might Be Coffee", users: 13 }
						]
					},
					{
						id: "g2b8v03xaedj8ht1emi",
						name: "Trending Rooms",
						rooms: [
							{ id: "73qvw65746acvo8yqfr", thumbnail: "https://lh6.googleusercontent.com/-ghASz3s6yL4/AAAAAAAAAAI/AAAAAAAAALc/tFblPp2myu0/s0-c-k-no-ns/photo.jpg", name: "Country", description: "Johnny Cash - I Walk The Line", users: 10 },
							{ id: "enxcysmhn1k7ld56ogvi", thumbnail: "http://66.media.tumblr.com/1734069af425e491fae7deae0a19869f/tumblr_o0i0xmIYrF1v421f2o1_1280.jpg", name: "Pop", description: "Sia - Cheap Thrills", users: 14 },
							{ id: "kqa99gbva7lij05dn29", thumbnail: "http://www.youredm.com/wp-content/uploads/2014/09/taking-you-higher.jpg", name: "Chill", description: "MrSuicideSheep - Taking you higher", users: 13 },
							{ id: "w19hu791iiub6wmjf9a4i", thumbnail: "http://edmsauce.wpengine.netdna-cdn.com/wp-content/uploads/2012/12/Deadmau5-album-title-goes-here.jpg", name: "EDM", description: "Deadmau5 - There Might Be Coffee", users: 13 }
						]
					}
				]
			}
		},
		methods: {
			logout() {
				$.ajax({
					method: "GET",
					url: "/users/logout",
					dataType: "json",
					complete: function (msg) {
						console.log(1, msg);
						alert("Logged out!");
						//do something
						location.reload();
					}
				});
			}
		},
		ready: function () {
			this.socket = io();
			this.socket.on("ready", function(loggedIn) {
				this.loggedIn = loggedIn;
			});
		},
		components: { MainHeader, MainFooter },
		events: {
			'register': function() {
				console.log('registered');
				$.ajax({
					method: "POST",
					url: "/users/register",
					data: JSON.stringify({
						email: this.register.email,
						username: this.register.username,
						password: this.register.password,
						recaptcha: grecaptcha.getResponse()
					}),
					contentType: "application/json; charset=utf-8",
					dataType: "json",
					success: function (msg) {
						console.log(1, msg);
						alert("Registered!");
						//do something
					},
					error: function (errormessage) {
						console.log(2, errormessage);
						alert("Not registered!");
						//do something else

					}
				});
			},
			'login': function() {
				console.log('login');
				$.ajax({
					method: "POST",
					url: "/users/login",
					data: JSON.stringify({
						email: this.login.email,
						password: this.login.password
					}),
					contentType: "application/json; charset=utf-8",
					dataType: "json",
					success: function (msg) {
						console.log(1, msg);
						alert("Logged in!");
						//do something
						location.reload();
					},
					error: function (errormessage) {
						console.log(2, errormessage);
						alert("Not logged in!");
						//do something else

					}
				});
			}
		}
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
				height: 384px;

				.rooms-room {
					position: relative;
					top: 16px;
					display: inline-block;
					clear: none;
					width: 256px;
					height: 345px;
					margin: 0 16px 0 16px;
					box-shadow: 0 1px 6px 2px rgba(0, 0, 0, 0.25);
					cursor: pointer;

					.room-info {
						display: flex;
						flex-direction: row;
						align-items: center;
						padding: 5px;
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
</style>
