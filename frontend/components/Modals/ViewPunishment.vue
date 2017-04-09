<template>
	<div>
		<modal title='View Punishment'>
			<div slot='body'>
				<article class="message">
					<div class="message-body">
						<strong>Type: </strong>{{ punishment.type }}<br/>
						<strong>Value: </strong>{{ punishment.value }}<br/>
						<strong>Reason: </strong>{{ punishment.reason }}<br/>
						<strong>Active: </strong>{{ punishment.active }}<br/>
						<strong>Expires at: </strong>{{ moment(punishment.expiresAt).format('MMMM Do YYYY, h:mm:ss a'); }} ({{ moment(punishment.expiresAt).fromNow() }})<br/>
						<strong>Punished at: </strong>{{ moment(punishment.punishedAt).format('MMMM Do YYYY, h:mm:ss a') }} ({{ moment(punishment.punishedAt).fromNow() }})<br/>
						<strong>Punished by: </strong>{{ punishment.punishedBy }}<br/>
					</div>
				</article>
			</div>
			<div slot='footer'>
				<button class='button is-danger' @click='$parent.toggleModal()'>
					<span>&nbsp;Close</span>
				</button>
			</div>
		</modal>
	</div>
</template>

<script>
	import io from '../../io';
	import { Toast } from 'vue-roaster';
	import Modal from './Modal.vue';
	import validation from '../../validation';

	export default {
		components: { Modal },
		data() {
			return {
				punishment: {},
				ban: {},
				moment
			}
		},
		methods: {},
		ready: function () {
			let _this = this;
			io.getSocket(socket => _this.socket = socket );
		},
		events: {
			closeModal: function () {
				this.$parent.modals.viewPunishment = false;
			},
			viewPunishment: function (punishment) {
				this.punishment = {
					type: punishment.type,
					value: punishment.value,
					reason: punishment.reason,
					active: punishment.active,
					expiresAt: punishment.expiresAt,
					punishedAt: punishment.punishedAt,
					punishedBy: punishment.punishedBy
				};
				this.$parent.toggleModal();
			}
		}
	}
</script>