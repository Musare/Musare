<template>
	<div class="app">
		<metadata title="Team" />
		<main-header />
		<div class="container">
			<div class="content-wrapper">
				<h2 class="has-text-centered page-title">Our Team</h2>
				<div class="columns">
					<div
						class="card column is-6-desktop is-offset-3-desktop is-12-mobile"
					>
						<header class="card-header">
							<p class="card-header-title">Kris</p>
						</header>
						<div class="card-content">
							<div class="content">
								<span class="role"
									><span class="custom-tag purple"
										>Senior Project Manager</span
									>
									and
									<span class="custom-tag blue"
										>Co-Founder</span
									></span
								>
								<ul>
									<li>
										<b>Joined: </b>
										September 23, 2015
									</li>
									<li>
										<b>Email: </b>
										<a href="mailto:kris@musare.com"
											>&#107;&#114;&#105;&#115;&#064;&#109;&#117;&#115;&#097;&#114;&#101;&#046;&#099;&#111;&#109;</a
										>
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
				<br />
				<div class="columns">
					<div
						class="card column is-6-desktop is-offset-3-desktop is-12-mobile"
					>
						<header class="card-header">
							<p class="card-header-title">Jonathan</p>
						</header>
						<div class="card-content">
							<div class="content">
								<span class="role"
									><span class="custom-tag light-blue"
										>Lead Developer</span
									></span
								>
								<ul>
									<li>
										<b>Joined: </b>
										August 28, 2016
									</li>
									<li>
										<b>Email: </b>
										<a href="mailto:jonathan@musare.com"
											>&#106;&#111;&#110;&#097;&#116;&#104;&#097;&#110;&#064;&#109;&#117;&#115;&#097;&#114;&#101;&#046;&#099;&#111;&#109;</a
										>
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
				<br />
				<div class="columns">
					<div
						class="card column is-6-desktop is-offset-3-desktop is-12-mobile"
					>
						<header class="card-header">
							<p class="card-header-title">Antonio</p>
						</header>
						<div class="card-content">
							<div class="content">
								<span class="role"
									><span class="custom-tag light-green"
										>Moderator</span
									></span
								>
								<ul>
									<li>
										<b>Joined: </b>
										November 11, 2015
									</li>
									<li>
										<b>Email: </b>
										<a href="mailto:antonio@musare.com"
											>&#97;&#110;&#116;&#111;&#110;&#105;&#111;&#64;&#109;&#117;&#115;&#97;&#114;&#101;&#46;&#99;&#111;&#109;</a
										>
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
				<div id="special-thanks">
					<h4 class="has-text-centered">Special Thanks</h4>
					<br />
					<p class="has-text-centered thanks">
						Special thanks to Owen Diffey, Zachery, Adryd, Cameron
						Kline, Wesley McCann,
						<strong>Akira Laine (Co-Founder)</strong>, Johannes
						Andersen and Aaron Gildea for their contributions to
						Musare.
					</p>
				</div>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";

export default {
	components: { MainHeader, MainFooter }
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.night-mode {
	.card {
		background-color: $night-mode-secondary;
		p {
			color: #ddd;
		}
	}
}

li a {
	color: dodgerblue;
	border-bottom: 0 !important;
}

ul {
	margin-left: 0;
	margin-right: 0;
	list-style: none;
}

.columns {
	margin: 0;
}

.card-content .content {
	font-size: 15px;
}

.card-header-title {
	font-size: 17px;
	font-weight: 700;
}

.role {
	font-size: 16px;
	font-weight: 500;
}

.custom-tag.blue {
	border-bottom: 2px #0066f4 solid;
}

.custom-tag.pink {
	border-bottom: 2px #ff99dd solid;
}

.custom-tag.light-blue {
	border-bottom: 2px #00baf4 solid;
	background-color: transparent !important;
}

.custom-tag.light-green {
	border-bottom: 2px #019875 solid;
}

.custom-tag.purple {
	border-bottom: 2px $purple solid;
}

#special-thanks {
	margin-top: 60px;

	.thanks {
		font-size: 15px;
	}
}
</style>
