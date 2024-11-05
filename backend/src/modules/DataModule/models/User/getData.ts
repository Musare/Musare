export default {
	enabled: true,
	blacklistedProperties: [
		"services.password.password",
		"services.password.reset.code",
		"services.password.reset.expires",
		"services.password.set.code",
		"services.password.set.expires",
		"email.verificationToken"
	],
	specialProperties: {
		hasPassword: [
			{
				$addFields: {
					hasPassword: {
						$cond: [
							{
								$eq: [
									{ $type: "$services.password.password" },
									"string"
								]
							},
							true,
							false
						]
					}
				}
			}
		]
	}
};
