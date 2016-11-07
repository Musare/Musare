<template>
	<nav class="nav">
		<div class="nav-left">
			<a class="nav-item is-brand" href="#" v-link="{ path: '/' }">
				Musare
			</a>
		</div>

		<!--<span class="nav-toggle" :class="{ 'is-active': isActive }" @click="toggleMobileMenu()">
			<span></span>
			<span></span>
			<span></span>
		</span>-->

		<div class="nav-right">
			<a class="nav-item" href="#" v-link="{ path: '/admin/queue' }">
				Admin Queue
			</a>
			<a class="nav-item" href="#">
				About
			</a>
			<a class="nav-item" href="#">
				Donate
			</a>
			<a class="nav-item" href="#" v-if="$parent.$parent.loggedIn" @click="$parent.$parent.logout()">
				Sign Out
			</a>
			<span class="grouped" v-else>
				<a class="nav-item" href="#" @click="$parent.toggleModal('login')">
					Sign In
				</a>
				<a class="nav-item" href="#" @click="$parent.toggleModal('register')">
					Register
				</a>
			</span>
		</div>
	</nav>
</template>

<style lang="sass" scoped>
	.grouped {
		margin: 0;
		display: flex;
		text-decoration: none;
	}
</style>
