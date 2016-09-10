<template>
	<div class="header">
		<vs-navbar fixed="top" type="light" variant="default" full>
			<a class="navbar-brand" href="#">Musare</a>
			<vs-nav type="navbar" class="pull-xs-right">
				<vs-nav-item link="#">The Project</vs-nav-item>
				<vs-nav-item link="#">Donate</vs-nav-item>
				<vs-nav-item link="#">
					<vs-dropdown text="Account" size="md" variant="primary" :arrow="arrow" :caret="false">
						<ul class="dropdown-menu dropdown-menu-left">
							<li><a class="dropdown-item" href="#">Login</a></li>
							<li><a class="dropdown-item" href="#">Register</a></li>
						</ul>
					</vs-dropdown>
				</vs-nav-item>
			</vs-nav>
		</vs-navbar>
	</div>
</template>

<script>
	import vuestrapBase from 'vuestrap-base-components'
	export default {
		data() {
			return {
				title: "Musare ;)"
			}
		},
		components: {
			'vs-navbar': vuestrapBase.navbar,
			'vs-nav':  vuestrapBase.nav,
			'vs-nav-item': vuestrapBase.navItem,
			'vs-dropdown': vuestrapBase.dropdown
		}
	}
</script>

<style lang="sass" scoped>
	.header {
		width: 100%;
		height: 64px;
		line-height: 64px;
		text-align: center;
		background-color: red;
	}
</style>
