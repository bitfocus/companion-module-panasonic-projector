var instance_skel = require('../../instance_skel');
var ntcontrol = require('ntcontrol-connection');
var debug;

const NUMBER_0_2048_REGEX_STRING = '(\\d|[1-9]\\d|[1-9]\\d\\d|1\\d\\d\\d|20[0-3]\\d|204[0-8])';
const RGB_REGEX_STRING = '/^' + NUMBER_0_2048_REGEX_STRING + ',' + NUMBER_0_2048_REGEX_STRING + ',' + NUMBER_0_2048_REGEX_STRING + '$/';

const DEFAULT_COLOR_RED = '2048,0,0';
const DEFAULT_COLOR_GREEN = '0,2048,0';
const DEFAULT_COLOR_BLUE = '0,0,2048';
const DEFAULT_COLOR_CYAN = '0,2048,2048';
const DEFAULT_COLOR_MAGNETA = '2048,0,2048';
const DEFAULT_COLOR_YELLOW = '2048,2048,0';
const DEFAULT_COLOR_WHITE = '2048,2048,2048';

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
	White: 'white'
}

const EMPTY_LAMBDA = () => { /* nop */ }

function foregroundPicker(defaultValue) {
	return {
		type: 'colorpicker',
		label: 'Foreground color',
		id: 'fg',
		default: defaultValue
	}
}

function backgroundPicker(defaultValue) {
	return {
		type: 'colorpicker',
		label: 'Background color',
		id: 'bg',
		default: defaultValue
	}
}

function rgbTextInput(id, label, defaultValue) {
	return {
		type: 'textinput',
		label: label + ' (R,G,B)',
		id: id,
		tooltip: label,
		default: defaultValue,
		regex: RGB_REGEX_STRING
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
class instance extends instance_skel {

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
	constructor(system, id, config) {
		super(system, id, config);

		this.variables = {};
		this.conenction = undefined;
		this.projector = undefined;

		this.choiceInputs = this.buildList(ntcontrol.ProjectorInput);
		this.choiceColorMatching = this.buildList(ntcontrol.ColorMatching);
		this.choiceShutterFadeTimes = this.buildList(ntcontrol.ShutterFade);
		this.choiceTestPattern = this.buildList(ntcontrol.TestPattern);
		this.choiceGridMode = this.buildList(ntcontrol.DisplayGridLines);
		this.choiceLampState = this.buildList(ntcontrol.LampControlStatus);

		this.choiceOnOff = [
			{ id: Constants.On, 	label: Constants.On },
			{ id: Constants.Off, 	label: Constants.Off }
		];

		this.choiceToggle = [
			{ id: Constants.On, 	label: Constants.On },
			{ id: Constants.Off, 	label: Constants.Off },
			{ id: Constants.Toggle, label: Constants.Toggle }
		];

		this.actions(); // export actions
	}

	/**
	 * Setup the actions.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @access public
	 * @since 1.0.0
	 */
	actions() {
		var actions = {};

		actions[Constants.Power] = {
			label: 'Turn on/off Projector',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: Constants.Toggle,
					choices: this.choiceToggle
				}
			]
		};

		actions[Constants.Shutter] = {
			label: 'Turn the Projector shutter on/off',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: Constants.Toggle,
					choices: this.choiceToggle
				}
			]
		};

		actions[Constants.ShutterFadeIn] = {
			label: 'Change the shutter fade-in time',
			options: [
				{
					type: 'dropdown',
					label: 'Fade-in setting',
					id: 'value',
					default: '0.0',
					choices: this.choiceShutterFadeTimes
				}
			]
		};

		actions[Constants.ShutterFadeOut] = {
			label: 'Change the shutter fade-out time',
			options: [
				{
					type: 'dropdown',
					label: 'Fade-out setting',
					id: 'value',
					default: '0.0',
					choices: this.choiceShutterFadeTimes
				}
			]
		};

		actions[Constants.Freeze] = {
			label: 'Turn the Projector freeze on/off',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: Constants.Toggle,
					choices: this.choiceToggle
				}
			]
		};

		actions[Constants.InputSource] = {
			label: 'Change the Input Source',
			options: [
				{
					type: 'dropdown',
					label: 'Input Source',
					id: Constants.InputSource,
					default: '',
					choices: this.choiceInputs
				}
			]
		};

		actions[Constants.ColorMatchingMode] = {
			label: 'Change the Color Matching mode',
			options: [
				{
					type: 'dropdown',
					label: 'Color Matching',
					id: 'mode',
					default: ntcontrol.ColorMatching.Off,
					choices: this.choiceColorMatching
				}
			]
		};

		actions[Constants.ColorMatching3Color] = {
			label: 'Set colors in 3-Color-Mode',
			options: [
				rgbTextInput(Constants.Red, 'Red', DEFAULT_COLOR_RED),
				rgbTextInput(Constants.Green, 'Green', DEFAULT_COLOR_GREEN),
				rgbTextInput(Constants.Blue, 'Blue', DEFAULT_COLOR_BLUE)
			]
		};

		actions[Constants.ColorMatching7Color] = {
			label: 'Set colors in 7-Color-Mode',
			options: [
				rgbTextInput(Constants.Red, 'Red', DEFAULT_COLOR_RED),
				rgbTextInput(Constants.Green, 'Green', DEFAULT_COLOR_GREEN),
				rgbTextInput(Constants.Blue, 'Blue', DEFAULT_COLOR_BLUE),
				rgbTextInput(Constants.Cyan, 'Cyan', DEFAULT_COLOR_CYAN),
				rgbTextInput(Constants.Magenta, 'Magenta', DEFAULT_COLOR_MAGNETA),
				rgbTextInput(Constants.Yellow, 'Yellow', DEFAULT_COLOR_YELLOW),
				rgbTextInput(Constants.White, 'White', DEFAULT_COLOR_WHITE)
			]
		};

		actions[Constants.TestPattern] = {
			label: 'Change The Test Pattern',
			options: [
				{
					type: 'dropdown',
					label: 'Test Pattern',
					id: Constants.TestPattern,
					default: ntcontrol.TestPattern.Off,
					choices: this.choiceTestPattern
				}
			]
		};

		// TODO: Should work, but needs testing with a projector with activated upgrade kit
		/*
		actions[Constants.GridDisplay] = {
			label: 'Change grid settings',
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
			]
		};
		*/

		actions[Constants.Brightness] = {
			label: 'Change brightness control gain',
			options: [
				{
					type: 'number',
					label: 'Brightness',
					id: 'value',
					min: 20,
					max: 100,
					default: 100,
					required: true,
					range: true
				}
			]
		};

		this.setActions(actions);
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.0.0
	 */
	config_fields() {

		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module will connect to any supported Panasonic projector device.'
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Projector IP',
				width: 10,
				regex: this.REGEX_IP
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Control Port',
				width: 2,
				default:"1024",
				regex: this.REGEX_PORT
			},
			{
				type: 'textinput',
				id: 'user',
				width: 6,
				label: 'Username',
				default: 'admin1'
			},
			{
				type: 'textinput',
				id: 'pass',
				width: 6,
				label: 'Password',
				default: 'panasonic'
			}
		]
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	destroy() {
		if (this.connection !== undefined) {
			this.connection.removeAllListeners();
			this.connection.destroy();
			delete this.connection;
		}
		
		if (this.projector !== undefined) {
			this.projector.removeAllListeners();
			delete this.projector;
		}

		debug("destroy", this.id);
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	init() {
		debug = this.debug;
		
		this.initVariables();
		this.initFeedbacks();
		this.initPresets();

		if (this.connection !== undefined) {
			this.connection.removeAllListeners();
			this.connection.destroy();
			delete this.connection
		}

		this.status(this.STATUS_UNKNOWN, 'Connecting...');
		this.connection = this.createConnection(this.config);
		this.connection.setAuthentication(this.config.user, this.config.pass);

		this.projector = this.createProjector(this.connection);

		// start connection
		this.connection.connect();
	}

	stateChangeHandler(field, value) {
		this.debug('Received change: ' + field + ' -> ' + value)
		switch (field) {
			case 'model':
				this.setVariable('model', value);
				break;
			case 'name':
				this.setVariable('name', value);
				break;
			case 'Power':
				this.setVariable(Constants.Power, value);
				this.checkFeedbacks(Constants.Power);
				break;
			case 'Freeze':
				this.setVariable(Constants.Freeze, value);
				this.checkFeedbacks(Constants.Freeze);
				break;
			case 'Shutter':
				this.setVariable(Constants.Shutter, value);
				this.checkFeedbacks(Constants.Shutter);
				break;
			case 'InputSelect':
				this.setVariable(Constants.InputSource, value);
				this.checkFeedbacks(Constants.InputSource);
				break;
			case 'LampControlStatus':
				this.setVariable(Constants.LampStatus, ntcontrol.enumValueToLabel(ntcontrol.LampControlStatus, value));
				this.checkFeedbacks(Constants.LampStatus);
				break;
			case 'BrightnessControl':
				this.setVariable(Constants.Brightness, value);
				this.checkFeedbacks(Constants.Brightness);
				break;
			case 'TestPattern':
				this.setVariable(Constants.TestPattern, ntcontrol.enumValueToLabel(ntcontrol.TestPattern, value));
				this.checkFeedbacks(Constants.TestPattern);
				break;
			case 'ColorMatching':
				this.setVariable(Constants.ColorMatchingMode, ntcontrol.enumValueToLabel(ntcontrol.ColorMatching, value));
				this.handleColorMatchingChanged(value);
				this.checkFeedbacks(Constants.ColorMatchingMode);
				this.checkFeedbacks(Constants.ColorMatching3Color);
				this.checkFeedbacks(Constants.ColorMatching7Color);
				break;
			default:
				var matches = /^ColorMatching(\d)Colors(Red|Green|Blue|Cyan|Magenta|Yellow|White)$/.exec(field)
				if (matches.length === 3) {
					this.setVariable(Constants.ColorMatchingMode + '_' + matches[1] + 'c_' + matches[2].toLocaleLowerCase(), value.R + ',' + value.G + ',' + value.B);
					this.checkFeedbacks(Constants.ColorMatching3Color);
					this.checkFeedbacks(Constants.ColorMatching7Color);
				}
				break;
		}
	}

	handleColorMatchingChanged(mode) {
		switch (mode) {
			case ntcontrol.ColorMatching['3COLORS']:
				// 3-color-matching
				this.projector.addMonitoring(ntcontrol.ColorMatching3ColorsRedCommand);
				this.projector.addMonitoring(ntcontrol.ColorMatching3ColorsGreenCommand);
				this.projector.addMonitoring(ntcontrol.ColorMatching3ColorsBlueCommand);
				
				// 7-color-matching
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsRedCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsGreenCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsBlueCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsCyanCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsMagentaCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsYellowCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsWhiteCommand);
		
				this.setDefaultValues7Color();
				break;
			case ntcontrol.ColorMatching['7COLORS']:
				// 3-color-matching
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsRedCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsGreenCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsBlueCommand);
				
				// 7-color-matching
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsRedCommand);
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsGreenCommand);
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsBlueCommand);
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsCyanCommand);
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsMagentaCommand);
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsYellowCommand);
				this.projector.addMonitoring(ntcontrol.ColorMatching7ColorsWhiteCommand);
		
				this.setDefaultValues3Color();
				break;
			case ntcontrol.ColorMatching.OFF:
			default:
				// 3-color-matching
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsRedCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsGreenCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching3ColorsBlueCommand);
				
				// 7-color-matching
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsRedCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsGreenCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsBlueCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsCyanCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsMagentaCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsYellowCommand);
				this.projector.removeMonitoring(ntcontrol.ColorMatching7ColorsWhiteCommand);
		
				this.setDefaultValues3Color();
				this.setDefaultValues7Color();
				break;
		}
	}

	sendValue(cmd, value) {
		if (this.projector !== undefined) {
			try {
				this.projector.sendValue(cmd, value).then(EMPTY_LAMBDA, err => this.log('error', err.message || err));
			} catch (e) {
				this.log('error', e);
			}
		}
	}

	/**
	 * Executes the provided action.
	 *
	 * @param {Object} action - the action to be executed
	 * @access public
	 * @since 1.0.0
	 */
	action(action) {
		if (this.projector === undefined) {
			return;
		}

		var opt = action.options;

		try {
			switch (action.action) {
				case Constants.Power:
					if (opt.mode == Constants.On) {
						this.projector.setPower(true);
					} else if (opt.mode == Constants.Off) {
						this.projector.setPower(false);
					} else if (opt.mode == Constants.Toggle) {
						this.projector.setPower();
					} else {
						this.log('error', 'Invalid value for power command: ' + opt.mode)
					}
					break;
				case Constants.Shutter:
					if (opt.mode == Constants.On) {
						this.projector.setShutter(true);
					} else if (opt.mode == Constants.Off) {
						this.projector.setShutter(false);
					} else if (opt.mode == Constants.Toggle) {
						this.projector.setShutter();
					} else {
						this.log('error', 'Invalid value for shutter command: ' + opt.mode)
					}
					break;
				case Constants.ShutterFadeIn:
					this.sendValue(ntcontrol.ShutterFadeInCommand, opt.value);
					break;
				case Constants.ShutterFadeOut:
					this.sendValue(ntcontrol.ShutterFadeOutCommand, opt.value);
					break;
				case Constants.Freeze:
					if (opt.mode == Constants.On) {
						this.projector.setFreeze(true);
					} else if (opt.mode == Constants.Off) {
						this.projector.setFreeze(false);
					} else if (opt.mode == Constants.Toggle) {
						this.projector.setFreeze();
					} else {
						this.log('error', 'Invalid value for freeze command: ' + opt.mode)
					}
					break;
				case Constants.InputSource:
					this.projector.setInput(opt[Constants.InputSource]);
					break;
				case Constants.TestPattern:
					this.sendValue(ntcontrol.TestPatternCommand, opt.test_pattern);
					break;
				case Constants.ColorMatchingMode:
					this.sendValue(ntcontrol.ColorMatchingCommand, opt.mode);
					break;
				case Constants.ColorMatching3Color:
					this.sendValue(ntcontrol.ColorMatching3ColorsRedCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.Red]));
					this.sendValue(ntcontrol.ColorMatching3ColorsGreenCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.Green]));
					this.sendValue(ntcontrol.ColorMatching3ColorsBlueCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.Blue]));
					break;
				case Constants.ColorMatching7Color:
					this.sendValue(ntcontrol.ColorMatching7ColorsRedCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.Red]));
					this.sendValue(ntcontrol.ColorMatching7ColorsGreenCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.Green]));
					this.sendValue(ntcontrol.ColorMatching7ColorsBlueCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.Blue]));
					this.sendValue(ntcontrol.ColorMatching7ColorsCyanCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.Cyan]));
					this.sendValue(ntcontrol.ColorMatching7ColorsMagentaCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.Magenta]));
					this.sendValue(ntcontrol.ColorMatching7ColorsYellowCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.Yellow]));
					this.sendValue(ntcontrol.ColorMatching7ColorsWhiteCommand, ntcontrol.DefaultRgbConverter.parse(opt[Constants.White]));
					break;
				// TODO: Should work, but needs testing with a projector with activated upgrade kit
				//case Constants.GridDisplay:
				//	   this.sendValue(ntcontrol.GridSettingsCommand, { verticalLines: opt.vertical, horizontalLines: opt.horizontal, mode: opt.mode });
				//	   break;
				case Constants.Brightness:
					this.sendValue(ntcontrol.BrightnessControlCommand, opt.value);
					break;
				default:
					this.debug('Unhandeled action: ' + action.action)
					break;
			}		
		} catch (e) {
			this.log('error', e.message ? e.message : e);
		}
	}

	createConnection(config) {
		const obj = new ntcontrol.Client(config.host, config.port);
		obj.on(ntcontrol.Client.Events.DEBUG, d => this.log('debug', d));
		obj.on(ntcontrol.Client.Events.CONNECT, () => this.status(this.STATUS_OK, 'Connected'));
		obj.on(ntcontrol.Client.Events.DISCONNECT, () => this.status(this.STATUS_ERROR, 'Disconnected'));
		return obj
	}

	createProjector(connection) {
		const obj = new ntcontrol.Projector(connection, this.log);
		obj.on(ntcontrol.Projector.Events.STATE_CHANGE, this.stateChangeHandler.bind(this));
		obj.addMonitoring(ntcontrol.BrightnessControlCommand);
		obj.addMonitoring(ntcontrol.TestPatternCommand);
		obj.addMonitoring(ntcontrol.ColorMatchingCommand);
		return obj
	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 1.0.0
	 */
	updateConfig(config) {

		const resetConnection = config.host !== this.config.host || config.port !== this.config.port || this.connection === undefined;
		let updateAuthentication = config.user !== this.config.user || config.pass !== this.config.pass;

		this.config = config;
		
		if (resetConnection) {
			if (this.connection !== undefined) {
				this.connection.removeAllListeners();
				this.connection.destroy();
				delete this.connection
			}

			this.connection = this.createConnection(this.config);
			updateAuthentication = true;
		}

		if (updateAuthentication) {
			this.connection.setAuthentication(this.config.user, this.config.pass);
		}

		if (this.projector === undefined) {
			this.projector = this.createProjector(this.connection);
		}

		if (resetConnection || updateAuthentication) {
			// restart connection
			this.connection.connect();
		}

		// always update the connetion, to reset internal projector state
		this.projector.updateConnection(this.connection);
	}

	/**
	 * INTERNAL: initialize feedbacks. TODO
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	initFeedbacks() {
		// feedbacks
		var feedbacks = {};

		feedbacks[Constants.LampStatus] = {
			label: 'Change background color by lamp status',
			description: 'If the state of the projector lamps matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(0,255,0)),
				{
					type: 'dropdown',
					label: 'Lamp state',
					id: 'state',
					default: ntcontrol.LampControlStatus['LAMP ON'],
					choices: this.choiceLampState
				}
			],
			callback: (feedback) => {
				if (this.variables[Constants.LampStatus] === feedback.options.state) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks[Constants.Power] = {
			label: 'Change background color by power status',
			description: 'If the state of the projector (power) matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(255,0,0)),
				{
					type: 'dropdown',
					label: 'Power state',
					id: 'state',
					default: Constants.On,
					choices: this.choiceOnOff
				}
			],
			callback: (feedback) => {
				if (this.variables[Constants.Power] === (feedback.options.state === Constants.On)) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks[Constants.Shutter] = {
			label: 'Change background color by shutter status',
			description: 'If the state of the projector shutter matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(255,0,0)),
				{
					type: 'dropdown',
					label: 'Shutter state',
					id: 'state',
					default: Constants.On,
					choices: this.choiceOnOff
				}
			],
			callback: (feedback) => {
				if (this.variables[Constants.Shutter] === (feedback.options.state === Constants.On)) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks[Constants.Freeze] = {
			label: 'Change background color by freeze status',
			description: 'If the state of the projector freeze matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(255,0,0)),
				{
					type: 'dropdown',
					label: 'Freeze state',
					id: 'state',
					default: Constants.On,
					choices: this.choiceOnOff
				}
			],
			callback: (feedback) => {
				if (this.variables[Constants.Freeze] === (feedback.options.state === Constants.On)) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks[Constants.InputSource] = {
			label: 'Change background color by input selection',
			description: 'If the selected input of the projector matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(255,255,0)),
				{
					type: 'dropdown',
					label: 'Input',
					id: Constants.InputSource,
					default: '',
					choices: this.choiceInputs
				}
			],
			callback: (feedback) => {
				if (this.variables[Constants.InputSource] === feedback.options[Constants.InputSource]) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks[Constants.TestPattern] = {
			label: 'Change background color by current test pattern',
			description: 'If the current test pattern of the projector matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(255,255,0)),
				{
					type: 'dropdown',
					label: 'Test pattern',
					id: Constants.TestPattern,
					default: ntcontrol.TestPattern.Off,
					choices: this.choiceTestPattern
				}
			],
			callback: (feedback) => {
				if (ntcontrol.TestPattern[this.variables[Constants.TestPattern]] === feedback.options[Constants.TestPattern]) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks[Constants.ColorMatchingMode] = {
			label: 'Change background color by current color matching mode',
			description: 'If the current color matching mode matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(255,255,0)),
				{
					type: 'dropdown',
					label: 'Color matching mode',
					id: 'mode',
					default: ntcontrol.ColorMatching.OFF,
					choices: this.choiceColorMatching
				}
			],
			callback: (feedback) => {
				if (ntcontrol.ColorMatching[this.variables[Constants.ColorMatchingMode]] === feedback.options.mode) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks[Constants.ColorMatching3Color] = {
			label: 'Change background color by current color values for 3 color matching mode',
			description: 'If the current color values for 3 color matching mode matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(255,255,0)),
				rgbTextInput(Constants.Red, 'Red', DEFAULT_COLOR_RED),
				rgbTextInput(Constants.Green, 'Green', DEFAULT_COLOR_GREEN),
				rgbTextInput(Constants.Blue, 'Blue', DEFAULT_COLOR_BLUE)
			],
			callback: (feedback) => {
				if (ntcontrol.ColorMatching[this.variables[Constants.ColorMatchingMode]] === ntcontrol.ColorMatching['3COLORS']
					&& this.variables[Constants.ColorMatching3Color + '_' + Constants.Red] === feedback.options[Constants.Red]
					&& this.variables[Constants.ColorMatching3Color + '_' + Constants.Green] === feedback.options[Constants.Green]
					&& this.variables[Constants.ColorMatching3Color + '_' + Constants.Blue] === feedback.options[Constants.Blue]) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks[Constants.ColorMatching7Color] = {
			label: 'Change background color by current color values for 7 color matching mode',
			description: 'If the current color values for 7 color matching mode matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(255,255,0)),
				rgbTextInput(Constants.Red, 'Red', DEFAULT_COLOR_RED),
				rgbTextInput(Constants.Green, 'Green', DEFAULT_COLOR_GREEN),
				rgbTextInput(Constants.Blue, 'Blue', DEFAULT_COLOR_BLUE),
				rgbTextInput(Constants.Cyan, 'Cyan', DEFAULT_COLOR_CYAN),
				rgbTextInput(Constants.Magenta, 'Magenta', DEFAULT_COLOR_MAGNETA),
				rgbTextInput(Constants.Yellow, 'Yellow', DEFAULT_COLOR_YELLOW),
				rgbTextInput(Constants.White, 'White', DEFAULT_COLOR_WHITE)
			],
			callback: (feedback) => {
				if (ntcontrol.ColorMatching[this.variables[Constants.ColorMatchingMode]] === ntcontrol.ColorMatching['7COLORS']
					&& this.variables[Constants.ColorMatching7Color + '_' + Constants.Red] === feedback.options[Constants.Red]
					&& this.variables[Constants.ColorMatching7Color + '_' + Constants.Green] === feedback.options[Constants.Green]
					&& this.variables[Constants.ColorMatching7Color + '_' + Constants.Blue] === feedback.options[Constants.Blue]
					&& this.variables[Constants.ColorMatching7Color + '_' + Constants.Cyan] === feedback.options[Constants.Cyan]
					&& this.variables[Constants.ColorMatching7Color + '_' + Constants.Magenta] === feedback.options[Constants.Magenta]
					&& this.variables[Constants.ColorMatching7Color + '_' + Constants.Yellow] === feedback.options[Constants.Yellow]
					&& this.variables[Constants.ColorMatching7Color + '_' + Constants.White] === feedback.options[Constants.White]) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks[Constants.Brightness] = {
			label: 'Change background color by current brightness',
			description: 'If the current brightness of the projector matches the specified value, change background color of the bank',
			options: [
				foregroundPicker(this.rgb(0,0,0)),
				backgroundPicker(this.rgb(255,255,0)),
				{
					type: 'number',
					label: 'Brightness',
					id: 'value',
					min: 20,
					max: 100,
					default: 100,
					required: true,
					range: true
				}
			],
			callback: (feedback) => {
				if (this.variables[Constants.Brightness] === feedback.options.value) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		this.setFeedbackDefinitions(feedbacks);
	}

	setVariable(name, value) {
		// var changed = this.variables[name] !== value;
		this.variables[name] = value;
		super.setVariable(name, value);
	}

	setDefaultValues3Color() {
		this.setVariable(Constants.ColorMatching3Color + '_' + Constants.Red, DEFAULT_COLOR_RED);
		this.setVariable(Constants.ColorMatching3Color + '_' + Constants.Green, DEFAULT_COLOR_GREEN);
		this.setVariable(Constants.ColorMatching3Color + '_' + Constants.Blue, DEFAULT_COLOR_BLUE);
	}

	setDefaultValues7Color() {
		this.setVariable(Constants.ColorMatching7Color + '_' + Constants.Red, DEFAULT_COLOR_RED);
		this.setVariable(Constants.ColorMatching7Color + '_' + Constants.Green, DEFAULT_COLOR_GREEN);
		this.setVariable(Constants.ColorMatching7Color + '_' + Constants.Blue, DEFAULT_COLOR_BLUE);
		this.setVariable(Constants.ColorMatching7Color + '_' + Constants.Cyan, DEFAULT_COLOR_CYAN);
		this.setVariable(Constants.ColorMatching7Color + '_' + Constants.Magenta, DEFAULT_COLOR_MAGNETA);
		this.setVariable(Constants.ColorMatching7Color + '_' + Constants.Yellow, DEFAULT_COLOR_YELLOW);
		this.setVariable(Constants.ColorMatching7Color + '_' + Constants.White, DEFAULT_COLOR_WHITE);
	}

	/**
	 * INTERNAL: initialize variables.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	initVariables() {
		var variables = [];

		variables.push({
			label: 'Name',
			name: 'name'
		});
		this.setVariable('name', '');

		variables.push({
			label: 'Model',
			name: 'model'
		});
		this.setVariable('model', '');

		variables.push({
			label: 'Power state',
			name: Constants.Power
		});
		this.setVariable(Constants.Power, undefined);

		variables.push({
			label: 'Shutter state',
			name: Constants.Shutter
		});
		this.setVariable(Constants.Shutter, undefined);

		variables.push({
			label: 'Freeze state',
			name: Constants.Freeze
		});
		this.setVariable(Constants.Freeze, undefined);

		variables.push({
			label: 'Input',
			name: Constants.InputSource
		});
		this.setVariable(Constants.InputSource, '');

		variables.push({
			label: 'Lamp state',
			name: Constants.LampStatus
		});
		this.setVariable(Constants.LampStatus, undefined);

		variables.push({
			label: 'Brightness',
			name: Constants.Brightness
		});
		this.setVariable(Constants.Brightness, 100);

		variables.push({
			label: 'Test Pattern',
			name: Constants.TestPattern
		});
		this.setVariable(Constants.TestPattern, ntcontrol.TestPattern.Off);

		variables.push({
			label: 'Color Matching Mode',
			name: Constants.ColorMatchingMode
		});
		this.setVariable(Constants.ColorMatchingMode, ntcontrol.ColorMatching.Off);

		variables.push({
			label: 'Color Matching 3-Colors: Red',
			name: Constants.ColorMatching3Color + '_' + Constants.Red
		});

		variables.push({
			label: 'Color Matching 3-Colors: Green',
			name: Constants.ColorMatching3Color + '_' + Constants.Green
		});

		variables.push({
			label: 'Color Matching 3-Colors: Blue',
			name: Constants.ColorMatching3Color + '_' + Constants.Blue
		});

		variables.push({
			label: 'Color Matching 7-Colors: Red',
			name: Constants.ColorMatching7Color + '_' + Constants.Red
		});

		variables.push({
			label: 'Color Matching 7-Colors: Green',
			name: Constants.ColorMatching7Color + '_' + Constants.Green
		});

		variables.push({
			label: 'Color Matching 7-Colors: Blue',
			name: Constants.ColorMatching7Color + '_' + Constants.Blue
		});

		variables.push({
			label: 'Color Matching 7-Colors: Cyan',
			name: Constants.ColorMatching7Color + '_' + Constants.Cyan
		});

		variables.push({
			label: 'Color Matching 7-Colors: Magenta',
			name: Constants.ColorMatching7Color + '_' + Constants.Magenta
		});

		variables.push({
			label: 'Color Matching 7-Colors: Yellow',
			name: Constants.ColorMatching7Color + '_' + Constants.Yellow
		});

		variables.push({
			label: 'Color Matching 7-Colors: White',
			name: Constants.ColorMatching7Color + '_' + Constants.White
		});
		
		this.setDefaultValues3Color();
		this.setDefaultValues7Color();

		this.setVariableDefinitions(variables);
	}

	/**
	 * INTERNAL: initialize presets.
	 *
	 * @access protected
	 * @since 1.1.1
	 */
	initPresets () {
		var presets = [];

		presets.push({
			category: 'Commands',
			label: 'Power Toggle',
			bank: {
				style: 'text',
				text: 'Power Toggle',
				size: '18',
				color: this.rgb(255,255,255),
				bgcolor: this.rgb(0,0,0)
			},
			feedbacks: [
				{
					type: Constants.Power,
					options: {
						bg: this.rgb(255,0,0),
						fg: this.rgb(255,255,255),
						state: Constants.On
					}
				}
			],
			actions: [
				{
					action: Constants.Power,
					options: {
						mode: Constants.Toggle
					}
				}
			]
		});

		presets.push({
			category: 'Commands',
			label: 'Shutter Toggle',
			bank: {
				style: 'text',
				text: 'Shutter Toggle',
				size: '18',
				color: this.rgb(255,255,255),
				bgcolor: this.rgb(0,0,0)
			},
			feedbacks: [
				{
					type: Constants.Shutter,
					options: {
						bg: this.rgb(255,0,0),
						fg: this.rgb(255,255,255),
						state: Constants.On
					}
				}
			],
			actions: [
				{
					action: Constants.Shutter,
					options: {
						mode: Constants.Toggle
					}
				}
			]
		});

		presets.push({
			category: 'Commands',
			label: 'Freeze Toggle',
			bank: {
				style: 'text',
				text: 'Freeze Toggle',
				size: '18',
				color: this.rgb(255,255,255),
				bgcolor: this.rgb(0,0,0)
			},
			feedbacks: [
				{
					type: Constants.Freeze,
					options: {
						bg: this.rgb(255,0,0),
						fg: this.rgb(255,255,255),
						state: Constants.On
					}
				}
			],
			actions: [
				{
					action: Constants.Freeze,
					options: {
						mode: Constants.Toggle
					}
				}
			]
		});

		presets.push({
			category: 'Commands',
			label: 'Brightness',
			bank: {
				style: 'text',
				text: 'Brightness\\n100',
				size: '14',
				color: this.rgb(255,255,255),
				bgcolor: this.rgb(0,0,0)
			},
			feedbacks: [
				{
					type: Constants.Brightness,
					options: {
						bg: this.rgb(255,255,0),
						fg: this.rgb(255,255,255),
						value: 100
					}
				}
			],
			actions: [
				{
					action: Constants.Brightness,
					options: {
						value: 100
					}
				}
			]
		});

		for (let input of this.choiceInputs) {
			presets.push({
				category: 'Input source',
				label: 'Selection of input ' + input.label,
				bank: {
					style: 'text',
					text: 'Input\\n' + (input.label || '').replace('COMPUTER', 'COMP. '),
					size: '14',
					color: this.rgb(255,255,255),
					bgcolor: this.rgb(0,0,0)
				},
				feedbacks: [
					{
						type: Constants.InputSource,
						options: {
							bg: this.rgb(255,255,0),
							fg: this.rgb(0,0,0),
							[Constants.InputSource]: input.id
						}
					}
				],
				actions: [
					{
						action: Constants.InputSource,
						options: {
							[Constants.InputSource]: input.id
						}
					}
				]
			});
		}

		for (let pattern of this.choiceTestPattern) {
			presets.push({
				category: 'Test pattern',
				label: 'Selection of test pattern ' + pattern.label,
				bank: {
					style: 'text',
					text: 'Pattern\\n' + (pattern.label || '').replace('Crosshatch', 'Cross').replace('orizontal', 'orz.'),
					size: '14',
					color: this.rgb(255,255,255),
					bgcolor: this.rgb(0,0,0)
				},
				feedbacks: [
					{
						type: Constants.TestPattern,
						options: {
							bg: this.rgb(255,255,0),
							fg: this.rgb(0,0,0),
							[Constants.TestPattern]: pattern.id
						}
					}
				],
				actions: [
					{
						action: Constants.TestPattern,
						options: {
							[Constants.TestPattern]: pattern.id
						}
					}
				]
			});
		}

		presets.push({
			category: 'Color matching',
			label: 'Color matching OFF',
			bank: {
				style: 'text',
				text: 'Color matching OFF',
				size: '14',
				color: this.rgb(255,255,255),
				bgcolor: this.rgb(0,0,0)
			},
			feedbacks: [
				{
					type: Constants.ColorMatchingMode,
					options: {
						bg: this.rgb(255,255,0),
						fg: this.rgb(0,0,0),
						state: ntcontrol.ColorMatching.OFF
					}
				}
			],
			actions: [
				{
					action: Constants.ColorMatchingMode,
					options: {
						mode: ntcontrol.ColorMatching.OFF
					}
				}
			]
		});

		presets.push({
			category: 'Color matching',
			label: 'Color matching 3-colors',
			bank: {
				style: 'text',
				text: 'Color matching 3-colors',
				size: '14',
				color: this.rgb(255,255,255),
				bgcolor: this.rgb(0,0,0)
			},
			feedbacks: [
				{
					type: Constants.ColorMatching3Color,
					options: {
						bg: this.rgb(255,255,0),
						fg: this.rgb(0,0,0),
						[Constants.Red]: DEFAULT_COLOR_RED,
						[Constants.Green]: DEFAULT_COLOR_GREEN,
						[Constants.Blue]: DEFAULT_COLOR_BLUE
					}
				}
			],
			actions: [
				{
					action: Constants.ColorMatchingMode,
					options: {
						mode: ntcontrol.ColorMatching["3COLORS"]
					}
				},
				{
					action: Constants.ColorMatching3Color,
					options: {
						[Constants.Red]: DEFAULT_COLOR_RED,
						[Constants.Green]: DEFAULT_COLOR_GREEN,
						[Constants.Blue]: DEFAULT_COLOR_BLUE
					}
				}
			]
		});

		presets.push({
			category: 'Color matching',
			label: 'Color matching 7-colors',
			bank: {
				style: 'text',
				text: 'Color matching 7-colors',
				size: '14',
				color: this.rgb(255,255,255),
				bgcolor: this.rgb(0,0,0)
			},
			feedbacks: [
				{
					type: Constants.ColorMatching7Color,
					options: {
						bg: this.rgb(255,255,0),
						fg: this.rgb(0,0,0),
						[Constants.Red]: DEFAULT_COLOR_RED,
						[Constants.Green]: DEFAULT_COLOR_GREEN,
						[Constants.Blue]: DEFAULT_COLOR_BLUE,
						[Constants.Cyan]: DEFAULT_COLOR_CYAN,
						[Constants.Magenta]: DEFAULT_COLOR_MAGNETA,
						[Constants.Yellow]: DEFAULT_COLOR_YELLOW,
						[Constants.White]: DEFAULT_COLOR_WHITE
					}
				}
			],
			actions: [
				{
					action: Constants.ColorMatchingMode,
					options: {
						mode: ntcontrol.ColorMatching["7COLORS"]
					}
				},
				{
					action: Constants.ColorMatching7Color,
					options: {
						[Constants.Red]: DEFAULT_COLOR_RED,
						[Constants.Green]: DEFAULT_COLOR_GREEN,
						[Constants.Blue]: DEFAULT_COLOR_BLUE,
						[Constants.Cyan]: DEFAULT_COLOR_CYAN,
						[Constants.Magenta]: DEFAULT_COLOR_MAGNETA,
						[Constants.Yellow]: DEFAULT_COLOR_YELLOW,
						[Constants.White]: DEFAULT_COLOR_WHITE
					}
				}
			]
		});


		this.setPresetDefinitions(presets);
	}
}
exports = module.exports = instance;