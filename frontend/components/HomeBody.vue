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
</template>

<style lang="sass" scoped>
	.g-recaptcha {
		display: flex;
		justify-content: center;
		margin-top: 10px;
	}
</style>
