<template>
	<div class="modal fade" id="register" tabindex="-1" role="dialog" aria-labelledby="register-modal">
		<div class="modal-dialog" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
					<h4 class="modal-title">Register</h4>
				</div>
				<div class="modal-body">
					<input class="form-control" type="text" placeholder="Email..."/>
					<input class="form-control" type="text" placeholder="Username..."/>
					<input class="form-control" type="password" placeholder="Password..."/>
					<div class="g-recaptcha" data-sitekey="6Ld5jygTAAAAAEi0E1IwovUuVFhZKctMvKnY553W"></div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-primary" data-dismiss="modal">Submit</button>
				</div>
			</div>
		</div>
	</div>
	<div class="group" v-for="group in groups">
		<div class="group-title">{{group.name}}</div>
		<div class="group-rooms">
			<div class="rooms-room" v-for="room in group.rooms" @click="this.$dispatch('switchView', 'home', 'station');">
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
</template>

<script>
	export default {
		data() {
			return {
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
			log: thing => {
				console.log(thing);
			}
		}
	}
</script>

<style lang="sass" scoped>
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
