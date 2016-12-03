<template>
	<div class='sidebar' transition='slide' v-if='$parent.sidebars.playlist'>
		<div class='inner-wrapper'>
			<div class='title'>Playlists</div>

			<aside class='menu'>
				<ul class='menu-list'>
					<li>
						<a href='#'>Top 40</a>
						<a href='#' @click='$parent.editPlaylist(56);'>
							<i class='material-icons'>edit</i>
						</a>
					</li>
				</ul>
			</aside>

			<a class='button create-playlist' @click='$parent.toggleModal("createPlaylist")'>Create Playlist</a>
		</div>
	</div>
</template>

<script>
	export default {
		ready: function () {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.$parent.socket) {
					_this.socket = _this.$parent.$parent.socket;
					// get users playlists
					clearInterval(socketInterval);
				}
			}, 100);
		}
	}
</script>

<style type='scss' scoped>
	.sidebar {
		position: fixed;
		top: 0;
		right: 0;
		width: 300px;
		height: 100vh;
		background-color: #fff;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
	}

	.inner-wrapper {	
		top: 50px;
		position: relative;
	}

	.slide-transition {
		transition: transform 0.6s ease-in-out;
		transform: translateX(0);
	}

	.slide-enter, .slide-leave { transform: translateX(100%); }

	.title {
		background-color: rgb(3, 169, 244);
		text-align: center;
		padding: 10px;
		color: white;
		font-weight: 600;
	}

	.create-playlist {
		width: 100%;
    	margin-top: 25px;
		height: 40px;
		border-radius: 0;
		background: rgb(3, 169, 244);
    	color: #fff !important;
		border: 0;

		&:active, &:focus { border: 0; }
	}

	.menu { padding: 0 20px; }

	.menu-list li a:hover { color: #000 !important; }

	.menu-list li {
		display: flex;
		justify-content: space-between;
	}

	li a {
		display: flex;
    	align-items: center;
	}
</style>