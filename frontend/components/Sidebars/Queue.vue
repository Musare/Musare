<template>
	<div class='sidebar' transition='slide' v-if='$parent.sidebars.queue'>
		<div class='inner-wrapper'>
			<div class='title'>
				Queue
			</div>
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
					_this.socket.emit('stations.getPlaylist', _this.$parent.stationId, data => {
						console.log(data);
					});
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

	.slide-enter, .slide-leave {
		transform: translateX(100%);
	}

	.title {
		background-color: rgb(3, 169, 244);
		text-align: center;
		padding: 10px;
		color: white;
		font-weight: 600;
	}
</style>