const { CreateConvertToBooleanFeedbackUpgradeScript } = require('@companion-module/base')

const upgradeToBooleanFeedbacks = CreateConvertToBooleanFeedbackUpgradeScript({
	lamp_state: true,
	power: true,
	shutter: true,
	freeze: true,
	input: true,
	test_pattern: true,
	picture_mode: true,
	color_matching: true,
	color_matching_3c: true,
	color_matching_7c: true,
	brightness: true,
})

module.exports = [
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */
	// function (context, props) {
	// 	return {
	// 		updatedConfig: null,
	// 		updatedActions: [],
	// 		updatedFeedbacks: [],
	// 	}
	// },
	upgradeToBooleanFeedbacks,
]
