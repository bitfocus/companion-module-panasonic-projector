const { runEntrypoint, InstanceBase, Regex, combineRgb, InstanceStatus } = require('@companion-module/base')
const ntcontrol = require('ntcontrol-connection')
const UpgradeScripts = require('./upgrades')

const NUMBER_0_2048_REGEX_STRING = '(\\d|[1-9]\\d|[1-9]\\d\\d|1\\d\\d\\d|20[0-3]\\d|204[0-8])'
const RGB_REGEX_STRING =
	'/^' + NUMBER_0_2048_REGEX_STRING + ',' + NUMBER_0_2048_REGEX_STRING + ',' + NUMBER_0_2048_REGEX_STRING + '$/'

const DEFAULT_COLOR_RED = '2048,0,0'
const DEFAULT_COLOR_GREEN = '0,2048,0'
const DEFAULT_COLOR_BLUE = '0,0,2048'
const DEFAULT_COLOR_CYAN = '0,2048,2048'
const DEFAULT_COLOR_MAGNETA = '2048,0,2048'
const DEFAULT_COLOR_YELLOW = '2048,2048,0'
const DEFAULT_COLOR_WHITE = '2048,2048,2048'

const Constants = {
	Power: 'power',
	Shutter: 'shutter',
	ShutterFadeIn: 'shutter_fade_in',
	ShutterFadeOut: 'shutter_fade_out',
	Freeze: 'freeze',
	InputSource: 'input',
	ColorMatchingMode: 'color_matching',
	ColorMatching3Color: 'color_matching_3c',
	ColorMatching7Color: 'color_matching_7c',
	TestPattern: 'test_pattern',
	// TODO: Should work, but needs testing with a projector with activated upgrade kit
	//GridDisplay: 'grid_display',
	Brightness: 'brightness',
	LampStatus: 'lamp_state',
	On: 'on',
	Off: 'off',
	Toggle: 'toggle',
	Red: 'red',
	Green: 'green',
	Blue: 'blue',
	Cyan: 'cyan',
	Magenta: 'magenta',
	Yellow: 'yellow',
	White: 'white',
}

const EMPTY_LAMBDA = () => {
	/* nop */
}

function foregroundPicker(defaultValue) {
	return {
		type: 'colorpicker',
		label: 'Foreground color',
		id: 'fg',
		default: defaultValue,
	}
}

function backgroundPicker(defaultValue) {
	return {
		type: 'colorpicker',
		label: 'Background color',
		id: 'bg',
		default: defaultValue,
	}
}

function rgbTextInput(id, label, defaultValue) {
	return {
		type: 'textinput',
		label: label + ' (R,G,B)',
		id: id,
		tooltip: label,
		default: defaultValue,
		regex: Regex.SOMETHING,
	}
}

/**
 * Companion instance class for the Panasonic Projectors.
 *
 * @extends instance_skel
 * @version 1.1.0
 * @since 1.0.0
 * @author Matt Foulks <mfoulks1@gmail.com>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 */
class PanasonicInstance extends InstanceBase {
	buildList(type) {
		const result = []
		for (let id in type) {
			result.push({ id: type[id], label: id })
		}
		return result
	}

	/**
	 * Create an instance of a projector module.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @param {string} id - the instance ID
	 * @param {Object} config - saved user configuration parameters
	 * @since 1.0.0
	 */
	constructor(internal) {
		super(internal)

		this.variables = {}
		this.conenction = undefined
		this.projector = undefined

		this.choiceInputs = this.buildList(ntcontrol.ProjectorInput)
		this.choiceColorMatching = this.buildList(ntcontrol.ColorMatching)
		this.choiceShutterFadeTimes = this.buildList(ntcontrol.ShutterFade)
		this.choiceTestPattern = this.buildList(ntcontrol.TestPattern)
		this.choiceGridMode = this.buildList(ntcontrol.DisplayGridLines)
		this.choiceLampState = this.buildList(ntcontrol.LampControlStatus)

		this.choiceOnOff = [
			{ id: Constants.On, label: Constants.On },
			{ id: Constants.Off, label: Constants.Off },
		]

		this.choiceToggle = [
			{ id: Constants.On, label: Constants.On },
			{ id: Constants.Off, label: Constants.Off },
			{ id: Constants.Toggle, label: Constants.Toggle },
		]
	}

	/**
	 * Setup the actions.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	updateActions() {
		const actions = {}

		actions[Constants.Power] = {
			name: 'Turn on/off Projector',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: Constants.Toggle,
					choices: this.choiceToggle,
				},
			],
			callback: (action) => {
				if (action.options.mode == Constants.On) {
					this.projector.setPower(true)
				} else if (action.options.mode == Constants.Off) {
					this.projector.setPower(false)
				} else if (action.options.mode == Constants.Toggle) {
					this.projector.setPower()
				} else {
					this.log('error', 'Invalid value for power command: ' + action.options.mode)
				}
			},
		}

		actions[Constants.Shutter] = {
			name: 'Turn the Projector shutter on/off',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: Constants.Toggle,
					choices: this.choiceToggle,
				},
			],
			callback: (action) => {
				if (action.options.mode == Constants.On) {
					this.projector.setShutter(true)
				} else if (action.options.mode == Constants.Off) {
					this.projector.setShutter(false)
				} else if (action.options.mode == Constants.Toggle) {
					this.projector.setShutter()
				} else {
					this.log('error', 'Invalid value for shutter command: ' + action.options.mode)
				}
			},
		}

		actions[Constants.ShutterFadeIn] = {
			name: 'Change the shutter fade-in time',
			options: [
				{
					type: 'dropdown',
					label: 'Fade-in setting',
					id: 'value',
					default: '0.0',
					choices: this.choiceShutterFadeTimes,
				},
			],
			callback: (action) => {
				this.sendValue(ntcontrol.ShutterFadeInCommand, action.options.value)
			},
		}

		actions[Constants.ShutterFadeOut] = {
			name: 'Change the shutter fade-out time',
			options: [
				{
					type: 'dropdown',
					label: 'Fade-out setting',
					id: 'value',
					default: '0.0',
					choices: this.choiceShutterFadeTimes,
				},
			],
			callback: (action) => {
				this.sendValue(ntcontrol.ShutterFadeOutCommand, action.options.value)
			},
		}

		actions[Constants.Freeze] = {
			name: 'Turn the Projector freeze on/off',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: Constants.Toggle,
					choices: this.choiceToggle,
				},
			],
			callback: (action) => {
				if (action.options.mode == Constants.On) {
					this.projector.setFreeze(true)
				} else if (action.options.mode == Constants.Off) {
					this.projector.setFreeze(false)
				} else if (action.options.mode == Constants.Toggle) {
					this.projector.setFreeze()
				} else {
					this.log('error', 'Invalid value for freeze command: ' + action.options.mode)
				}
			},
		}

		actions[Constants.InputSource] = {
			name: 'Change the Input Source',
			options: [
				{
					type: 'dropdown',
					label: 'Input Source',
					id: Constants.InputSource,
					default: '',
					choices: this.choiceInputs,
				},
			],
			callback: (action) => {
				this.projector.setInput(action.options[Constants.InputSource])
			},
		}

		actions[Constants.ColorMatchingMode] = {
			name: 'Change the Color Matching mode',
			options: [
				{
					type: 'dropdown',
					label: 'Color Matching',
					id: 'mode',
					default: ntcontrol.ColorMatching.Off,
					choices: this.choiceColorMatching,
				},
			],
			callback: (action) => {
				this.sendValue(ntcontrol.ColorMatchingCommand, action.options.mode)
			},
		}

		actions[Constants.ColorMatching3Color] = {
			name: 'Set colors in 3-Color-Mode',
			options: [
				rgbTextInput(Constants.Red, 'Red', DEFAULT_COLOR_RED),
				rgbTextInput(Constants.Green, 'Green', DEFAULT_COLOR_GREEN),
				rgbTextInput(Constants.Blue, 'Blue', DEFAULT_COLOR_BLUE),
			],
			callback: (action) => {
				this.sendValue(
					ntcontrol.ColorMatching3ColorsRedCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.Red])
				)
				this.sendValue(
					ntcontrol.ColorMatching3ColorsGreenCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.Green])
				)
				this.sendValue(
					ntcontrol.ColorMatching3ColorsBlueCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.Blue])
				)
			},
		}

		actions[Constants.ColorMatching7Color] = {
			name: 'Set colors in 7-Color-Mode',
			options: [
				rgbTextInput(Constants.Red, 'Red', DEFAULT_COLOR_RED),
				rgbTextInput(Constants.Green, 'Green', DEFAULT_COLOR_GREEN),
				rgbTextInput(Constants.Blue, 'Blue', DEFAULT_COLOR_BLUE),
				rgbTextInput(Constants.Cyan, 'Cyan', DEFAULT_COLOR_CYAN),
				rgbTextInput(Constants.Magenta, 'Magenta', DEFAULT_COLOR_MAGNETA),
				rgbTextInput(Constants.Yellow, 'Yellow', DEFAULT_COLOR_YELLOW),
				rgbTextInput(Constants.White, 'White', DEFAULT_COLOR_WHITE),
			],
			callback: (action) => {
				this.sendValue(
					ntcontrol.ColorMatching7ColorsRedCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.Red])
				)
				this.sendValue(
					ntcontrol.ColorMatching7ColorsGreenCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.Green])
				)
				this.sendValue(
					ntcontrol.ColorMatching7ColorsBlueCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.Blue])
				)
				this.sendValue(
					ntcontrol.ColorMatching7ColorsCyanCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.Cyan])
				)
				this.sendValue(
					ntcontrol.ColorMatching7ColorsMagentaCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.Magenta])
				)
				this.sendValue(
					ntcontrol.ColorMatching7ColorsYellowCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.Yellow])
				)
				this.sendValue(
					ntcontrol.ColorMatching7ColorsWhiteCommand,
					ntcontrol.DefaultRgbConverter.parse(action.options[Constants.White])
				)
			},
		}

		actions[Constants.TestPattern] = {
			name: 'Change The Test Pattern',
			options: [
				{
					type: 'dropdown',
					label: 'Test Pattern',
					id: Constants.TestPattern,
					default: ntcontrol.TestPattern.Off,
					choices: this.choiceTestPattern,
				},
			],
			callback: (action) => {
				this.sendValue(ntcontrol.TestPatternCommand, action.options.test_pattern)
			},
		}

		// TODO: Should work, but needs testing with a projector with activated upgrade kit
		/*
		actions[Constants.GridDisplay] = {
			name: 'Change grid settings',
			options: [
				{
					type: 'number',
					label: 'Vertical lines',
					id: 'vertical',
					min: 1,
					max: 255,
					default: 11,
					required: true
				},
				{
					type: 'number',
					label: 'Horizontal lines',
					id: 'horizontal',
					min: 1,
					max: 255,
					default: 11,
					required: true
				},
				{
					type: 'dropdown',
					label: 'Mode / Color',
					id: 'mode',
					default: ntcontrol.DisplayGridLines.Off,
					choices: this.choiceGridMode
				}
			],
			callback: (action)=>{
					   this.sendValue(ntcontrol.GridSettingsCommand, { verticalLines: action.options.vertical, horizontalLines: action.options.horizontal, mode: action.options.mode });

			}
		};
		*/

		actions[Constants.Brightness] = {
			name: 'Change brightness control gain',
			options: [
				{
					type: 'number',
					label: 'Brightness',
					id: 'value',
					min: 20,
					max: 100,
					default: 100,
					required: true,
					range: true,
				},
			],
			callback: (action) => {
				this.sendValue(ntcontrol.BrightnessControlCommand, action.options.value)
			},
		}

		this.setActionDefinitions(actions)
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.0.0
	 */
	getConfigFields() {
		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module will connect to any supported Panasonic projector device.',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Projector IP',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Control Port',
				width: 4,
				default: '1024',
				regex: Regex.PORT,
			},
			{
				type: 'textinput',
				id: 'user',
				width: 6,
				label: 'Username',
				default: 'admin1',
			},
			{
				type: 'textinput',
				id: 'pass',
				width: 6,
				label: 'Password',
				default: 'panasonic',
			},
		]
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	async destroy() {
		if (this.connection !== undefined) {
			this.connection.removeAllListeners()
			this.connection.destroy()
			delete this.connection
		}

		if (this.projector !== undefined) {
			this.projector.removeAllListeners()
			delete this.projector
		}

		this.log('debug', 'destroy' + this.id)
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	async init(config) {
		this.config = config

		this.initVariables()
		this.initFeedbacks()
		this.initPresets()

		if (this.connection !== undefined) {
			this.connection.removeAllListeners()
			this.connection.destroy()
			delete this.connection
		}
		this.updateStatus(InstanceStatus.UnknownError, 'Connecting...')
		this.connection = this.createConnection(this.config)
		this.connection.setAuthentication(this.config.user, this.config.pass)

		this.projector = this.createProjector(this.connection)

		this.updateActions() // export actions

		// start connection
		this.connection.connect()
	}

	stateChangeHandler(field, value) {
		this.log('debug', 'Received change: ' + field + ' -> ' + value)
		switch (field) {
			case 'model':
				this.setVariableValues({ model: value })
				break
			case 'name':
				this.setVariableValues({ name: value })
				break
			case 'Power':
				this.setVariableValues({ [Constants.Power]: value })
				this.checkFeedbacks(Constants.Power)
				break
			case 'Freeze':
				this.setVariableValues({ [Constants.Freeze]: value })
				this.checkFeedbacks(Constants.Freeze)
				break
			case 'Shutter':
				this.setVariableValues({ [Constants.Shutter]: value })
				this.checkFeedbacks(Constants.Shutter)
				break
			case 'InputSelect':
				this.setVariableValues({ [Constants.InputSource]: value })
				this.checkFeedbacks(Constants.InputSource)
				break
			case 'LampControlStatus':
				this.setVariableValues({
					[Constants.LampStatus]: ntcontrol.enumValueToLabel(ntcontrol.LampControlStatus, value),
				})
				this.checkFeedbacks(Constants.LampStatus)
				break
			case 'BrightnessControl':
				this.setVariableValues({ [Constants.Brightness]: value })
				this.checkFeedbacks(Constants.Brightness)
				break
			case 'TestPattern':
				this.setVariableValues({ [Constants.TestPattern]: ntcontrol.enumValueToLabel(ntcontrol.TestPattern, value) })
				this.checkFeedbacks(Constants.TestPattern)
				break
			case 'ColorMatching':
				this.setVariableValues({
					[Constants.ColorMatchingMode]: ntcontrol.enumValueToLabel(ntcontrol.ColorMatching, value),
				})
				this.handleColorMatchingChanged(value)
				this.checkFeedbacks(Constants.ColorMatchingMode, Constants.ColorMatching3Color, Constants.ColorMatching7Color)
				break
			default:
				var matches = /^ColorMatching(\d)Colors(Red|Green|Blue|Cyan|Magenta|Yellow|White)$/.exec(field)
				if (matches.length === 3) {
					try {
						this.setVariableValues({
							[Constants.ColorMatchingMode + '_' + matches[1] + 'c_' + matches[2].toLocaleLowerCase()]:
								value.R + ',' + value.G + ',' + value.B,
						})
						this.checkFeedbacks(Constants.ColorMatching3Color, Constants.ColorMatching7Color)
					} catch (e) {
						this.debug(e)
					}
				}
				break
		}
	}

	handleColorMatchingChanged(mode) {
		switch (mode) {
			case ntcontrol.ColorMatching['3COLORS']:
				// 3-color-matching
				this.projector.addMonitoring(ntcontrol.ColorMatching3ColorsRedCommand)
				this.projector.addMonitoring(ntcontrol.ColorMatching3ColorsGreenCommand)
				this.projector.addMonitoring(ntcontrol.ColorMatching3ColorsBlueCommand)

				// 7-color-matching
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsRedCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsGreenCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsBlueCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsCyanCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsMagentaCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsYellowCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsWhiteCommand)

				this.setDefaultValues7Color()
				break
			case ntcontrol.ColorMatching['7COLORS']:
				// 3-color-matching
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsRedCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsGreenCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsBlueCommand)

				// 7-color-matching
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsRedCommand)
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsGreenCommand)
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsBlueCommand)
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsCyanCommand)
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsMagentaCommand)
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsYellowCommand)
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsWhiteCommand)

				this.setDefaultValues3Color()
				break
			case ntcontrol.ColorMatching.OFF:
			default:
				// 3-color-matching
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsRedCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsGreenCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsBlueCommand)

				// 7-color-matching
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsRedCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsGreenCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsBlueCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsCyanCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsMagentaCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsYellowCommand)
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsWhiteCommand)

				this.setDefaultValues3Color()
				this.setDefaultValues7Color()
				break
		}
	}

	/**
	 * Send the value to the Projector
	 * @param {string} cmd
	 * @param {string} value
	 */
	sendValue(cmd, value) {
		if (this.projector !== undefined) {
			try {
				this.projector.sendValue(cmd, value).then(EMPTY_LAMBDA, (err) => this.log('error', err.message || err))
			} catch (e) {
				this.log('error', e)
			}
		}
	}

	/**
	 * Setup a connection
	 * @param {config} config
	 * @returns
	 */
	createConnection(config) {
		const obj = new ntcontrol.Client(config.host, config.port)
		obj.on(ntcontrol.Client.Events.DEBUG, (d) => this.log('debug', d))
		obj.on(ntcontrol.Client.Events.CONNECT, () => this.updateStatus(InstanceStatus.Ok, 'Connected'))
		obj.on(ntcontrol.Client.Events.DISCONNECT, () => this.updateStatus(InstanceStatus.Disconnected, 'Disconnected'))
		return obj
	}

	/**
	 * Create the projector object
	 * @param {connection} connection
	 * @returns
	 */
	createProjector(connection) {
		const obj = new ntcontrol.Projector(connection, (level, message) => {
			/* 
			We need to pass in a function wrapper to call log, because if the ntcontrol-connection module calls companion's log, it will throw an error.
			this.log needs to be called by a Companion object.
			*/
			this.log(level, message)
		})
		obj.on(ntcontrol.Projector.Events.STATE_CHANGE, this.stateChangeHandler.bind(this))
		obj.addMonitoring(ntcontrol.BrightnessControlCommand)
		obj.addMonitoring(ntcontrol.TestPatternCommand)
		obj.addMonitoring(ntcontrol.ColorMatchingCommand)
		return obj
	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 1.0.0
	 */
	async configUpdated(config) {
		const resetConnection =
			config.host !== this.config.host || config.port !== this.config.port || this.connection === undefined
		let updateAuthentication = config.user !== this.config.user || config.pass !== this.config.pass

		this.config = config

		if (resetConnection) {
			if (this.connection !== undefined) {
				this.connection.removeAllListeners()
				this.connection.destroy()
				delete this.connection
			}

			this.connection = this.createConnection(this.config)
			updateAuthentication = true
		}

		if (updateAuthentication) {
			this.connection.setAuthentication(this.config.user, this.config.pass)
		}

		if (this.projector === undefined) {
			this.projector = this.createProjector(this.connection)
		}

		if (resetConnection || updateAuthentication) {
			// restart connection
			this.connection.connect()
		}

		// always update the connetion, to reset internal projector state
		this.projector.updateConnection(this.connection)
	}

	/**
	 * INTERNAL: initialize feedbacks. TODO
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	initFeedbacks() {
		// feedbacks
		const feedbacks = {}

		feedbacks[Constants.LampStatus] = {
			type: 'advanced',
			name: 'Change background color by lamp status',
			description:
				'If the state of the projector lamps matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(0, 255, 0)),
				{
					type: 'dropdown',
					label: 'Lamp state',
					id: 'state',
					default: ntcontrol.LampControlStatus['LAMP ON'],
					choices: this.choiceLampState,
				},
			],
			callback: (feedback) => {
				if (
					this.variables[Constants.LampStatus] ===
					ntcontrol.enumValueToLabel(ntcontrol.LampControlStatus, feedback.options.state)
				) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		feedbacks[Constants.Power] = {
			type: 'advanced',
			name: 'Change background color by power status',
			description:
				'If the state of the projector (power) matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(255, 0, 0)),
				{
					type: 'dropdown',
					label: 'Power state',
					id: 'state',
					default: Constants.On,
					choices: this.choiceOnOff,
				},
			],
			callback: (feedback) => {
				if (this.variables[Constants.Power] === (feedback.options.state === Constants.On)) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		feedbacks[Constants.Shutter] = {
			type: 'advanced',
			name: 'Change background color by shutter status',
			description:
				'If the state of the projector shutter matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(255, 0, 0)),
				{
					type: 'dropdown',
					label: 'Shutter state',
					id: 'state',
					default: Constants.On,
					choices: this.choiceOnOff,
				},
			],
			callback: (feedback) => {
				if (this.variables[Constants.Shutter] === (feedback.options.state === Constants.On)) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		feedbacks[Constants.Freeze] = {
			type: 'advanced',
			name: 'Change background color by freeze status',
			description:
				'If the state of the projector freeze matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(255, 0, 0)),
				{
					type: 'dropdown',
					label: 'Freeze state',
					id: 'state',
					default: Constants.On,
					choices: this.choiceOnOff,
				},
			],
			callback: (feedback) => {
				if (this.variables[Constants.Freeze] === (feedback.options.state === Constants.On)) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		feedbacks[Constants.InputSource] = {
			type: 'advanced',
			name: 'Change background color by input selection',
			description:
				'If the selected input of the projector matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(255, 255, 0)),
				{
					type: 'dropdown',
					label: 'Input',
					id: Constants.InputSource,
					default: '',
					choices: this.choiceInputs,
				},
			],
			callback: (feedback) => {
				if (this.variables[Constants.InputSource] === feedback.options[Constants.InputSource]) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		feedbacks[Constants.TestPattern] = {
			type: 'advanced',
			name: 'Change background color by current test pattern',
			description:
				'If the current test pattern of the projector matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(255, 255, 0)),
				{
					type: 'dropdown',
					label: 'Test pattern',
					id: Constants.TestPattern,
					default: ntcontrol.TestPattern.Off,
					choices: this.choiceTestPattern,
				},
			],
			callback: (feedback) => {
				if (ntcontrol.TestPattern[this.variables[Constants.TestPattern]] === feedback.options[Constants.TestPattern]) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		feedbacks[Constants.ColorMatchingMode] = {
			type: 'advanced',
			name: 'Change background color by current color matching mode',
			description:
				'If the current color matching mode matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(255, 255, 0)),
				{
					type: 'dropdown',
					label: 'Color matching mode',
					id: 'mode',
					default: ntcontrol.ColorMatching.OFF,
					choices: this.choiceColorMatching,
				},
			],
			callback: (feedback) => {
				if (ntcontrol.ColorMatching[this.variables[Constants.ColorMatchingMode]] === feedback.options.mode) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		feedbacks[Constants.ColorMatching3Color] = {
			type: 'advanced',
			name: 'Change background color by current color values for 3 color matching mode',
			description:
				'If the current color values for 3 color matching mode matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(255, 255, 0)),
				rgbTextInput(Constants.Red, 'Red', DEFAULT_COLOR_RED),
				rgbTextInput(Constants.Green, 'Green', DEFAULT_COLOR_GREEN),
				rgbTextInput(Constants.Blue, 'Blue', DEFAULT_COLOR_BLUE),
			],
			callback: (feedback) => {
				if (
					ntcontrol.ColorMatching[this.variables[Constants.ColorMatchingMode]] === ntcontrol.ColorMatching['3COLORS'] &&
					this.variables[Constants.ColorMatching3Color + '_' + Constants.Red] === feedback.options[Constants.Red] &&
					this.variables[Constants.ColorMatching3Color + '_' + Constants.Green] === feedback.options[Constants.Green] &&
					this.variables[Constants.ColorMatching3Color + '_' + Constants.Blue] === feedback.options[Constants.Blue]
				) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		feedbacks[Constants.ColorMatching7Color] = {
			type: 'advanced',
			name: 'Change background color by current color values for 7 color matching mode',
			description:
				'If the current color values for 7 color matching mode matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(255, 255, 0)),
				rgbTextInput(Constants.Red, 'Red', DEFAULT_COLOR_RED),
				rgbTextInput(Constants.Green, 'Green', DEFAULT_COLOR_GREEN),
				rgbTextInput(Constants.Blue, 'Blue', DEFAULT_COLOR_BLUE),
				rgbTextInput(Constants.Cyan, 'Cyan', DEFAULT_COLOR_CYAN),
				rgbTextInput(Constants.Magenta, 'Magenta', DEFAULT_COLOR_MAGNETA),
				rgbTextInput(Constants.Yellow, 'Yellow', DEFAULT_COLOR_YELLOW),
				rgbTextInput(Constants.White, 'White', DEFAULT_COLOR_WHITE),
			],
			callback: (feedback) => {
				if (
					ntcontrol.ColorMatching[this.variables[Constants.ColorMatchingMode]] === ntcontrol.ColorMatching['7COLORS'] &&
					this.variables[Constants.ColorMatching7Color + '_' + Constants.Red] === feedback.options[Constants.Red] &&
					this.variables[Constants.ColorMatching7Color + '_' + Constants.Green] === feedback.options[Constants.Green] &&
					this.variables[Constants.ColorMatching7Color + '_' + Constants.Blue] === feedback.options[Constants.Blue] &&
					this.variables[Constants.ColorMatching7Color + '_' + Constants.Cyan] === feedback.options[Constants.Cyan] &&
					this.variables[Constants.ColorMatching7Color + '_' + Constants.Magenta] ===
						feedback.options[Constants.Magenta] &&
					this.variables[Constants.ColorMatching7Color + '_' + Constants.Yellow] ===
						feedback.options[Constants.Yellow] &&
					this.variables[Constants.ColorMatching7Color + '_' + Constants.White] === feedback.options[Constants.White]
				) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		feedbacks[Constants.Brightness] = {
			type: 'advanced',
			name: 'Change background color by current brightness',
			description:
				'If the current brightness of the projector matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(combineRgb(0, 0, 0)),
				backgroundPicker(combineRgb(255, 255, 0)),
				{
					type: 'number',
					label: 'Brightness',
					id: 'value',
					min: 20,
					max: 100,
					default: 100,
					required: true,
					range: true,
				},
			],
			callback: (feedback) => {
				if (this.variables[Constants.Brightness] === feedback.options.value) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					}
				}
			},
		}

		this.setFeedbackDefinitions(feedbacks)
	}

	setDefaultValues3Color() {
		this.setVariableValues(Constants.ColorMatching3Color + '_' + Constants.Red, DEFAULT_COLOR_RED)
		this.setVariableValues(Constants.ColorMatching3Color + '_' + Constants.Green, DEFAULT_COLOR_GREEN)
		this.setVariableValues(Constants.ColorMatching3Color + '_' + Constants.Blue, DEFAULT_COLOR_BLUE)
	}

	setDefaultValues7Color() {
		this.setVariableValues(Constants.ColorMatching7Color + '_' + Constants.Red, DEFAULT_COLOR_RED)
		this.setVariableValues(Constants.ColorMatching7Color + '_' + Constants.Green, DEFAULT_COLOR_GREEN)
		this.setVariableValues(Constants.ColorMatching7Color + '_' + Constants.Blue, DEFAULT_COLOR_BLUE)
		this.setVariableValues(Constants.ColorMatching7Color + '_' + Constants.Cyan, DEFAULT_COLOR_CYAN)
		this.setVariableValues(Constants.ColorMatching7Color + '_' + Constants.Magenta, DEFAULT_COLOR_MAGNETA)
		this.setVariableValues(Constants.ColorMatching7Color + '_' + Constants.Yellow, DEFAULT_COLOR_YELLOW)
		this.setVariableValues(Constants.ColorMatching7Color + '_' + Constants.White, DEFAULT_COLOR_WHITE)
	}

	/**
	 * INTERNAL: initialize variables.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	initVariables() {
		const variables = []

		variables.push({
			name: 'Name',
			variableId: 'name',
		})

		variables.push({
			name: 'Model',
			variableId: 'model',
		})

		variables.push({
			name: 'Power state',
			variableId: Constants.Power,
		})

		variables.push({
			name: 'Shutter state',
			variableId: Constants.Shutter,
		})

		variables.push({
			name: 'Freeze state',
			variableId: Constants.Freeze,
		})

		variables.push({
			name: 'Input',
			variableId: Constants.InputSource,
		})

		variables.push({
			name: 'Lamp state',
			variableId: Constants.LampStatus,
		})

		variables.push({
			name: 'Brightness',
			variableId: Constants.Brightness,
		})

		variables.push({
			name: 'Test Pattern',
			variableId: Constants.TestPattern,
		})

		variables.push({
			name: 'Color Matching Mode',
			variableId: Constants.ColorMatchingMode,
		})

		variables.push({
			name: 'Color Matching 3-Colors: Red',
			variableId: Constants.ColorMatching3Color + '_' + Constants.Red,
		})

		variables.push({
			name: 'Color Matching 3-Colors: Green',
			variableId: Constants.ColorMatching3Color + '_' + Constants.Green,
		})

		variables.push({
			name: 'Color Matching 3-Colors: Blue',
			variableId: Constants.ColorMatching3Color + '_' + Constants.Blue,
		})

		variables.push({
			name: 'Color Matching 7-Colors: Red',
			variableId: Constants.ColorMatching7Color + '_' + Constants.Red,
		})

		variables.push({
			name: 'Color Matching 7-Colors: Green',
			variableId: Constants.ColorMatching7Color + '_' + Constants.Green,
		})

		variables.push({
			name: 'Color Matching 7-Colors: Blue',
			variableId: Constants.ColorMatching7Color + '_' + Constants.Blue,
		})

		variables.push({
			name: 'Color Matching 7-Colors: Cyan',
			variableId: Constants.ColorMatching7Color + '_' + Constants.Cyan,
		})

		variables.push({
			name: 'Color Matching 7-Colors: Magenta',
			variableId: Constants.ColorMatching7Color + '_' + Constants.Magenta,
		})

		variables.push({
			name: 'Color Matching 7-Colors: Yellow',
			variableId: Constants.ColorMatching7Color + '_' + Constants.Yellow,
		})

		variables.push({
			name: 'Color Matching 7-Colors: White',
			variableId: Constants.ColorMatching7Color + '_' + Constants.White,
		})

		this.setDefaultValues3Color()
		this.setDefaultValues7Color()

		this.setVariableDefinitions(variables)
		this.setVariableValues({
			[Constants.LampStatus]: undefined,
			[Constants.ColorMatchingMode]: ntcontrol.ColorMatching.Off,
			[Constants.TestPattern]: ntcontrol.TestPattern.Off,
			[Constants.Freeze]: undefined,
			[Constants.Brightness]: 100,
			[Constants.InputSource]: '',
			[Constants.Power]: undefined,
			[Constants.Shutter]: undefined,
			name: '',
			model: '',
		})
	}

	/**
	 * INTERNAL: initialize presets.
	 *
	 * @access protected
	 * @since 1.1.1
	 */
	initPresets() {
		const presets = {}

		presets['Power_Toggle'] = {
			category: 'Commands',
			type: 'button',
			name: 'Power Toggle',
			style: {
				text: 'Power Toggle',
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: Constants.Power,
					options: {
						state: Constants.On,
					},
					style: {
						bgcolor: combineRgb(255, 0, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: Constants.Power,
							options: {
								mode: Constants.Toggle,
							},
						},
					],
					up: [],
				},
			],
		}

		presets['Shutter_Toggle'] = {
			type: 'button',
			category: 'Commands',
			name: 'Shutter Toggle',
			style: {
				text: 'Shutter Toggle',
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: Constants.Shutter,
					options: {
						state: Constants.On,
					},
					style: {
						bgcolor: combineRgb(255, 0, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: Constants.Shutter,
							options: {
								mode: Constants.Toggle,
							},
						},
					],
					up: [],
				},
			],
		}

		presets['Freeze_Toggle'] = {
			type: 'button',
			category: 'Commands',
			name: 'Freeze Toggle',
			style: {
				text: 'Freeze Toggle',
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: Constants.Freeze,
					options: {
						state: Constants.On,
					},
					style: {
						bgcolor: combineRgb(255, 0, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: Constants.Freeze,
							options: {
								mode: Constants.Toggle,
							},
						},
					],
					up: [],
				},
			],
		}

		presets['Brightness'] = {
			type: 'button',
			category: 'Commands',
			name: 'Brightness',
			style: {
				text: 'Brightness\\n100',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: Constants.Brightness,
					options: {
						value: 100,
					},
					style: {
						bgcolor: combineRgb(255, 255, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
			steps: [
				{
					down: [
						{
							action: Constants.Brightness,
							options: {
								value: 100,
							},
						},
					],
					up: [],
				},
			],
		}

		for (let input of this.choiceInputs) {
			presets[`Selection_of_input_${input.label}`] = {
				type: 'button',
				category: 'Input source',
				name: 'Selection of input ' + input.label,
				style: {
					text: 'Input\\n' + (input.label || '').replace('COMPUTER', 'COMP. '),
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				feedbacks: [
					{
						feedbackId: Constants.InputSource,
						options: {
							[Constants.InputSource]: input.id,
						},
						style: {
							bgcolor: combineRgb(255, 255, 0),
							color: combineRgb(0, 0, 0),
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: Constants.InputSource,
								options: {
									[Constants.InputSource]: input.id,
								},
							},
						],
						up: [],
					},
				],
			}
		}

		for (let pattern of this.choiceTestPattern) {
			presets[`Selection_of_test_pattern_${pattern.label}`] = {
				type: 'button',
				category: 'Test pattern',
				name: 'Selection of test pattern ' + pattern.label,
				style: {
					text: 'Pattern\\n' + (pattern.label || '').replace('Crosshatch', 'Cross').replace('orizontal', 'orz.'),
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				feedbacks: [
					{
						feedbackId: Constants.TestPattern,
						options: {
							[Constants.TestPattern]: pattern.id,
						},
						style: {
							bgcolor: combineRgb(255, 255, 0),
							color: combineRgb(0, 0, 0),
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: Constants.TestPattern,
								options: {
									[Constants.TestPattern]: pattern.id,
								},
							},
						],
						up: [],
					},
				],
			}
		}

		presets['Color_matching_OFF'] = {
			type: 'button',
			category: 'Color matching',
			name: 'Color matching OFF',
			style: {
				text: 'Color matching OFF',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: Constants.ColorMatchingMode,
					options: {
						state: ntcontrol.ColorMatching.OFF,
					},
					style: {
						bgcolor: combineRgb(255, 255, 0),
						color: combineRgb(0, 0, 0),
					},
				},
			],
			steps: [
				{
					down: [
						{
							action: Constants.ColorMatchingMode,
							options: {
								mode: ntcontrol.ColorMatching.OFF,
							},
						},
					],
					up: [],
				},
			],
		}

		presets['Color_matching_3-colors'] = {
			type: 'button',
			category: 'Color matching',
			name: 'Color matching 3-colors',
			style: {
				text: 'Color matching 3-colors',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: Constants.ColorMatching3Color,
					options: {
						[Constants.Red]: DEFAULT_COLOR_RED,
						[Constants.Green]: DEFAULT_COLOR_GREEN,
						[Constants.Blue]: DEFAULT_COLOR_BLUE,
					},
					style: {
						bgcolor: combineRgb(255, 255, 0),
						color: combineRgb(0, 0, 0),
					},
				},
			],
			steps: [
				{
					down: [
						{
							action: Constants.ColorMatchingMode,
							options: {
								mode: ntcontrol.ColorMatching['3COLORS'],
							},
						},
					],
					up: [],
				},
				{
					down: [
						{
							action: Constants.ColorMatching3Color,
							options: {
								[Constants.Red]: DEFAULT_COLOR_RED,
								[Constants.Green]: DEFAULT_COLOR_GREEN,
								[Constants.Blue]: DEFAULT_COLOR_BLUE,
							},
						},
					],
					up: [],
				},
			],
		}

		presets['Color_matching_7-colors'] = {
			type: 'button',
			category: 'Color matching',
			name: 'Color matching 7-colors',
			style: {
				text: 'Color matching 7-colors',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: Constants.ColorMatching7Color,
					options: {
						[Constants.Red]: DEFAULT_COLOR_RED,
						[Constants.Green]: DEFAULT_COLOR_GREEN,
						[Constants.Blue]: DEFAULT_COLOR_BLUE,
						[Constants.Cyan]: DEFAULT_COLOR_CYAN,
						[Constants.Magenta]: DEFAULT_COLOR_MAGNETA,
						[Constants.Yellow]: DEFAULT_COLOR_YELLOW,
						[Constants.White]: DEFAULT_COLOR_WHITE,
					},
					style: {
						bgcolor: combineRgb(255, 255, 0),
						color: combineRgb(0, 0, 0),
					},
				},
			],
			steps: [
				{
					down: [
						{
							action: Constants.ColorMatchingMode,
							options: {
								mode: ntcontrol.ColorMatching['7COLORS'],
							},
						},
					],
					up: [],
				},
				{
					down: [
						{
							action: Constants.ColorMatching7Color,
							options: {
								[Constants.Red]: DEFAULT_COLOR_RED,
								[Constants.Green]: DEFAULT_COLOR_GREEN,
								[Constants.Blue]: DEFAULT_COLOR_BLUE,
								[Constants.Cyan]: DEFAULT_COLOR_CYAN,
								[Constants.Magenta]: DEFAULT_COLOR_MAGNETA,
								[Constants.Yellow]: DEFAULT_COLOR_YELLOW,
								[Constants.White]: DEFAULT_COLOR_WHITE,
							},
						},
					],
					up: [],
				},
			],
		}

		this.setPresetDefinitions(presets)
	}
}
runEntrypoint(PanasonicInstance, UpgradeScripts)
