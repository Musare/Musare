<template>
	<div>
		<router-view></router-view>
	</div>
</template>

<script>
	export default {
		replace: false,
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
				likes: [],
				dislikes: [],
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
						alert("Logged in!");
						location.reload();
					}
				});
			}
		},
		ready: function () {
			let local = this;
			local.socket = io();
			local.socket.on("ready", status => {
				local.loggedIn = status;
				local.socket.emit("/user/ratings", result => {
					if (!result.err) {
						local.likes = result.likes;
						local.dislikes = result.dislikes;
					}
				});
			});
		},
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
						if (msg) console.log(msg);
						alert("Registered!");
						//do something
					},
					error: function (err) {
						if (err) console.log(err);
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
						if (msg) console.log(msg);
						alert("Logged in!");
						//do something
					},
					error: function (err) {
						if (err) console.log(err);
						alert("Not logged in!");
						//do something else

					}
				});
			}
		}
	}
</script>
