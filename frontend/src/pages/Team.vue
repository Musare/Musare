<template>
	<div class="app">
		<page-metadata title="Team" />
		<main-header />
		<div class="container">
			<div class="content-wrapper">
				<h1 class="page-title has-text-centered">Team</h1>

				<h2 class="has-text-centered">Current Team</h2>
				<div class="group">
					<div
						v-for="member in currentTeam"
						:key="member.name"
						class="card"
					>
						<header class="card-header">
							<profile-picture
								:avatar="member.avatar"
								:name="member.name"
							/>
							<div>
								<strong>{{ member.name }}</strong>
								<span v-if="member.active"
									>Active: {{ member.active }}</span
								>
							</div>
							<a
								v-if="member.link"
								:href="member.link"
								target="_blank"
								class="material-icons"
							>
								link
							</a>
						</header>
						<div class="card-content">
							<div
								v-if="member.bio"
								class="bio"
								v-html="member.bio"
							></div>
							<div v-if="member.projects" class="projects">
								<a
									v-for="project in member.projects"
									:key="project"
									class="pill"
									:href="
										'https://github.com/Musare/' +
										project +
										'/commits?author=' +
										member.github
									"
									target="_blank"
								>
									{{ project }}
								</a>
							</div>
						</div>
					</div>
				</div>
				<h3 class="has-text-centered">Previous Team</h3>
				<div class="group">
					<div
						v-for="member in previousTeam"
						:key="member.name"
						class="card"
					>
						<header class="card-header">
							<profile-picture
								:avatar="{ type: 'text', color: 'grey' }"
								:name="member.name"
							/>
							<div>
								<strong>{{ member.name }}</strong>
								<span v-if="member.active"
									>Active: {{ member.active }}</span
								>
							</div>
							<a
								v-if="member.link"
								:href="member.link"
								target="_blank"
								class="material-icons"
							>
								link
							</a>
						</header>
						<div class="card-content">
							<div
								v-if="member.bio"
								class="bio"
								v-html="member.bio"
							></div>
							<div v-if="member.projects" class="projects">
								<a
									v-for="project in member.projects"
									:key="project"
									class="pill"
									:href="
										'https://github.com/Musare/' +
										project +
										'/commits?author=' +
										member.github
									"
									target="_blank"
								>
									{{ project }}
								</a>
							</div>
						</div>
					</div>
				</div>
				<div class="other-contributors">
					<h4>Other Contributors</h4>
					<div>
						<a
							v-for="member in otherContributors"
							:key="member.name"
							:href="member.link"
							target="_blank"
						>
							{{ member.name }}
						</a>
					</div>
				</div>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import MainHeader from "@/components/layout/MainHeader.vue";
import MainFooter from "@/components/layout/MainFooter.vue";
import ProfilePicture from "@/components/ProfilePicture.vue";

export default {
	components: { MainHeader, MainFooter, ProfilePicture },
	data() {
		return {
			currentTeam: [
				{
					name: "Kristian Vos",
					bio: "Co-Founder, Owner, Lead Developer, System Admin and QA Tester.",
					projects: [
						"MusareMeteor",
						"MusareReact",
						"MusareNode",
						"MusareStatus",
						"MusareTranslation",
						"aw-watcher-musare",
						"lofig"
					],
					active: "Sept 2015 - present",
					github: "KrisVos130",
					link: "https://kvos.dev",
					avatar: {
						type: "text",
						color: "orange"
					}
				},
				{
					name: "Owen Diffey",
					bio: "Developer, Designer, System Admin and QA Tester. Previously Owner and Project Manager.",
					projects: [
						"MusareMeteor",
						"MusareReact",
						"MusareNode",
						"vue-roaster"
					],
					active: "Feb 2016 - present",
					github: "odiffey",
					link: "https://diffey.dev",
					avatar: {
						type: "text",
						color: "purple"
					}
				},
				{
					name: "Jonathan Graham",
					bio: `
						<em>Student based in the UK studying Computer Science at university.</em>
						<br /><br />
						Lead Developer, Designer and QA Tester.
						`,
					projects: [
						"MusareMeteor",
						"MusareReact",
						"MusareNode",
						"vue-roaster",
						"lofig"
					],
					active: "Aug 2016 - present",
					github: "jonathan-grah",
					link: "https://jgraham.dev",
					avatar: {
						type: "text",
						color: "blue"
					}
				}
			],
			previousTeam: [
				{
					name: "Akira Laine",
					bio: "Co-Founder, Lead Developer, Designer and QA Tester.",
					projects: ["MusareMeteor"],
					active: "Sept 2015 - Feb 2016",
					github: "darthmeme",
					link: "https://github.com/AkiraLaine"
				},
				{
					name: "Cameron Kline",
					bio: "Developer, Designer and QA Tester.",
					projects: ["MusareMeteor", "MusareReact", "MusareNode"],
					active: "Aug - Nov 2016",
					github: "luveti",
					link: "https://github.com/luveti"
				},
				{
					name: "Antonio",
					bio: "Official instance Moderator.",
					active: "Unknown"
				},
				{
					name: "Aaron Gildea",
					bio: "Official instance Moderator.",
					active: "Unknown"
				},
				{
					name: "Johannes Andersen",
					bio: "Official instance Moderator and QA Tester.",
					active: "Unknown",
					link: "https://github.com/Johannes-Andersen"
				},
				{
					name: "Adryd",
					bio: "Created Logo and Notes image.",
					active: "May 2016",
					link: "https://github.com/Adryd"
				}
			],
			otherContributors: [
				{
					name: "arvind-iyer",
					link: "https://github.com/arvind-iyer"
				},
				{
					name: "CullenIO",
					link: "https://github.com/CullenIO"
				},
				{
					name: "Wesley McCann",
					link: "https://github.com/Septimus"
				}
			]
		};
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	.group .card {
		background-color: var(--dark-grey-3);
		p {
			color: var(--light-grey-2);
		}
	}
}

.container {
	max-width: 100% !important;
}

a {
	color: var(--primary-color);
	&:hover,
	&:focus {
		filter: brightness(95%);
	}
}

h2,
h3,
h4 {
	margin: 20px 0;
}
h2 {
	margin-top: 50px;
}
.other-contributors {
	display: flex;
	flex-direction: column;
	justify-content: center;
	text-align: center;
	margin-bottom: 50px;

	div {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		a {
			background: var(--white);
			padding: 10px;
			border-radius: @border-radius;
			white-space: nowrap;
			margin-top: 5px;
			font-size: 16px;
			text-align: center;
			box-shadow: 0 1px 2px rgba(10, 10, 10, 0.1),
				0 0 0 1px rgba(10, 10, 10, 0.1);
			&:not(:last-of-type) {
				margin-right: 5px;
			}
		}
	}
}

.group {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	margin: 0 auto;
	max-width: 1260px;

	.card {
		display: inline-flex;
		position: relative;
		background-color: var(--white);
		color: var(--dark-grey);
		flex-direction: column;
		width: calc(100% - 30px);
		max-width: 400px;
		margin: 10px;
		text-align: left;
		border-radius: @border-radius;
		box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1),
			0 0 0 1px rgba(10, 10, 10, 0.1);
		.card-header {
			display: flex;
			position: relative;
			line-height: 22.5px;
			padding: 10px;
			.profile-picture {
				margin-right: 10px;
				width: 45px;
				height: 45px;
			}

			/deep/ .profile-picture.using-initials span {
				font-size: calc(
					45px / 5 * 2
				); // 2/5th of .profile-picture height/width
			}

			div {
				display: flex;
				flex-direction: column;
				line-height: 20px;
				margin: auto 0;
				strong {
					font-size: 18px;
				}
			}
			a {
				margin-top: auto;
				margin-bottom: auto;
				margin-left: auto;
			}
		}
		.card-content {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			padding: 20px;

			.bio {
				font-size: 16px;
				margin-bottom: 10px;
			}
			.projects {
				display: flex;
				flex-wrap: wrap;
				margin-top: auto;
			}
		}
	}
}
</style>
