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

const EMPTY_LAMBDA = () => { /* nop */ }

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
		this.conenction = undefined
		this.projector = undefined

		this.choiceInputs = this.buildList(ntcontrol.ProjectorInput);
		this.choiceColorMatching = this.buildList(ntcontrol.ColorMatching);
		this.choiceShutterFadeTimes = this.buildList(ntcontrol.ShutterFade);
		this.choiceTestPattern = this.buildList(ntcontrol.TestPattern);
		this.choiceGridMode = this.buildList(ntcontrol.DisplayGridLines);

		this.choiceToggle = [
			{ id: 'on', 	label: 'On' },
			{ id: 'off', 	label: 'Off' },
			{ id: 'toggle', label: 'Toggle' }
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

		actions['power'] = {
			label: 'Turn on/off Projector',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'toggle',
					choices: this.choiceToggle
				}
			]
		};

		actions['shutter'] = {
			label: 'Turn the Projector shutter on/off',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'toggle',
					choices: this.choiceToggle
				}
			]
		};

		actions['shutter_fade_in'] = {
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

		actions['shutter_fade_out'] = {
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

		actions['freeze'] = {
			label: 'Turn the Projector freeze on/off',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'toggle',
					choices: this.choiceToggle
				}
			]
		};

		actions['input_source'] = {
			label: 'Change the Input Source',
			options: [
				{
					type: 'dropdown',
					label: 'Input Source',
					id: 'source',
					default: '',
					choices: this.choiceInputs
				}
			]
		};

		actions['color_matching_mode'] = {
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

		actions['color_matching_3c'] = {
			label: 'Set colors in 3-Color-Mode',
			options: [
				{
					type: 'textinput',
					label: 'Red (R,G,B)',
					id: 'red',
					tooltip: 'Red',
					default: DEFAULT_COLOR_RED,
					regex: RGB_REGEX_STRING
				},
				{
					type: 'textinput',
					label: 'Green (R,G,B)',
					id: 'green',
					tooltip: 'Green',
					default: DEFAULT_COLOR_GREEN,
					regex: RGB_REGEX_STRING
				},
				{
					type: 'textinput',
					label: 'Blue (R,G,B)',
					id: 'blue',
					tooltip: 'Blue',
					default: DEFAULT_COLOR_BLUE,
					regex: RGB_REGEX_STRING
				}
			]
		};

		actions['color_matching_7c'] = {
			label: 'Set colors in 7-Color-Mode',
			options: [
				{
					type: 'textinput',
					label: 'Red (R,G,B)',
					id: 'red',
					tooltip: 'Red',
					default: DEFAULT_COLOR_RED,
					regex: RGB_REGEX_STRING
				},
				{
					type: 'textinput',
					label: 'Green (R,G,B)',
					id: 'green',
					tooltip: 'Green',
					default: DEFAULT_COLOR_GREEN,
					regex: RGB_REGEX_STRING
				},
				{
					type: 'textinput',
					label: 'Blue (R,G,B)',
					id: 'blue',
					tooltip: 'Blue',
					default: DEFAULT_COLOR_BLUE,
					regex: RGB_REGEX_STRING
				},
				{
					type: 'textinput',
					label: 'Cyan (R,G,B)',
					id: 'cyan',
					tooltip: 'Cyan',
					default: DEFAULT_COLOR_CYAN,
					regex: RGB_REGEX_STRING
				},
				{
					type: 'textinput',
					label: 'Magenta (R,G,B)',
					id: 'magenta',
					tooltip: 'Magenta',
					default: DEFAULT_COLOR_MAGNETA,
					regex: RGB_REGEX_STRING
				},
				{
					type: 'textinput',
					label: 'Yellow (R,G,B)',
					id: 'yellow',
					tooltip: 'Yellow',
					default: DEFAULT_COLOR_YELLOW,
					regex: RGB_REGEX_STRING
				},
				{
					type: 'textinput',
					label: 'White (R,G,B)',
					id: 'white',
					tooltip: 'White',
					default: DEFAULT_COLOR_WHITE,
					regex: RGB_REGEX_STRING
				}
			]
		};

		actions['test_pattern'] = {
			label: 'Change The Test Pattern',
			options: [
				{
					type: 'dropdown',
					label: 'Test Pattern',
					id: 'test_pattern',
					default: ntcontrol.TestPattern.Off,
					choices: this.choiceTestPattern
				}
			]
		};

		actions['grid_display'] = {
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

		actions['brightness'] = {
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
				this.setVariable('power', value);
				break;
			case 'Freeze':
				this.setVariable('freeze', value);
				break;
			case 'Shutter':
				this.setVariable('shutter', value);
				break;
			case 'InputSelect':
				this.setVariable('input', value);
				break;
			case 'LampControlStatus':
				this.setVariable('lamp_state', ntcontrol.enumValueToLabel(ntcontrol.LampControlStatus, value));
				break;
			case 'BrightnessControl':
				this.setVariable('brightness', value);
				break;
			case 'TestPattern':
				this.setVariable('test_pattern', ntcontrol.enumValueToLabel(ntcontrol.TestPattern, value));
				break;
			case 'ColorMatching':
				this.setVariable('color_matching', ntcontrol.enumValueToLabel(ntcontrol.ColorMatching, value));
				this.handleColorMatchingChanged(value);
				break;
			default:
				var matches = /^ColorMatching(\d)Colors(Red|Green|Blue|Cyan|Magenta|Yellow|White)$/.exec(value)
				if (matches.length === 3) {
					this.setVariable('color_matching_' + matches[1] + 'c_' + matches[2].toLocaleLowerCase(), value);
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
				case 'power':
					if (opt.mode == 'on') {
						this.projector.setPower(true);
					} else if (opt.mode == 'off') {
						this.projector.setPower(false);
					} else if (opt.mode == 'toggle') {
						this.projector.setPower();
					} else {
						this.log('error', 'Invalid value for power command: ' + opt.mode)
					}
					break;
				case 'shutter':
					if (opt.mode == 'on') {
						this.projector.setShutter(true);
					} else if (opt.mode == 'off') {
						this.projector.setShutter(false);
					} else if (opt.mode == 'toggle') {
						this.projector.setShutter();
					} else {
						this.log('error', 'Invalid value for shutter command: ' + opt.mode)
					}
					break;
				case 'shutter_fade_in':
					this.sendValue(ntcontrol.ShutterFadeInCommand, opt.value);
					break;
				case 'shutter_fade_out':
					this.sendValue(ntcontrol.ShutterFadeOutCommand, opt.value);
					break;
				case 'freeze':
					if (opt.mode == 'on') {
						this.projector.setFreeze(true);
					} else if (opt.mode == 'off') {
						this.projector.setFreeze(false);
					} else if (opt.mode == 'toggle') {
						this.projector.setFreeze();
					} else {
						this.log('error', 'Invalid value for freeze command: ' + opt.mode)
					}
					break;
				case 'input_source':
					this.projector.setInput(opt.source);
					break;
				case 'test_pattern':
					this.sendValue(ntcontrol.TestPatternCommand, opt.test_pattern);
					break;
				case 'color_matching_mode':
					this.sendValue(ntcontrol.ColorMatchingCommand, opt.mode);
					break;
				case 'color_matching_mode_3c':
					this.sendValue(ntcontrol.ColorMatching3ColorsRedCommand, ntcontrol.DefaultRgbConverter.parse(opt.red));
					this.sendValue(ntcontrol.ColorMatching3ColorsGreenCommand, ntcontrol.DefaultRgbConverter.parse(opt.green));
					this.sendValue(ntcontrol.ColorMatching3ColorsBlueCommand, ntcontrol.DefaultRgbConverter.parse(opt.blue));
					break;
				case 'color_matching_mode_7c':
					this.sendValue(ntcontrol.ColorMatching7ColorsRedCommand, ntcontrol.DefaultRgbConverter.parse(opt.red));
					this.sendValue(ntcontrol.ColorMatching7ColorsGreenCommand, ntcontrol.DefaultRgbConverter.parse(opt.green));
					this.sendValue(ntcontrol.ColorMatching7ColorsBlueCommand, ntcontrol.DefaultRgbConverter.parse(opt.blue));
					this.sendValue(ntcontrol.ColorMatching7ColorsCyanCommand, ntcontrol.DefaultRgbConverter.parse(opt.cyan));
					this.sendValue(ntcontrol.ColorMatching7ColorsMagentaCommand, ntcontrol.DefaultRgbConverter.parse(opt.magenta));
					this.sendValue(ntcontrol.ColorMatching7ColorsYellowCommand, ntcontrol.DefaultRgbConverter.parse(opt.yellow));
					this.sendValue(ntcontrol.ColorMatching7ColorsWhiteCommand, ntcontrol.DefaultRgbConverter.parse(opt.white));
					break;
				case 'grid_display':
					this.sendValue(ntcontrol.GridSettingsCommand, { verticalLines: opt.vertical, horizontalLines: opt.horizontal, mode: opt.mode });
					break;
				case 'brightness':
					this.sendValue(ntcontrol.BrightnessControlCommand, opt.value);
					break;
				default:
					this.debug('Unhandeled action: ' + action.action)
					break;
			}		
		} catch (e) {
			this.log('error', e);
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
	/*
	initFeedbacks() {
		// feedbacks
		var feedbacks = {};

		feedbacks['input_bg'] = {
			label: 'Change background color by destination',
			description: 'If the input specified is in use by the output specified, change background color of the bank',
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: this.rgb(0,0,0)
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: this.rgb(255,255,0)
				},
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: '0',
					choices: this.CHOICES_INPUTS
				},
				{
					type: 'dropdown',
					label: 'Output',
					id: 'output',
					default: '0',
					choices: this.CHOICES_OUTPUTS
				}
			],
			callback: (feedback, bank) => {
				if (true) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks['selected_destination'] = {
			label: 'Change background color by selected destination',
			description: 'If the input specified is in use by the selected output specified, change background color of the bank',
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: this.rgb(0,0,0)
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: this.rgb(255,255,0)
				},
				{
					type: 'dropdown',
					label: 'Output',
					id: 'output',
					default: '0',
					choices: this.CHOICES_OUTPUTS
				}
			],
			callback: (feedback, bank) => {
				if (parseInt(feedback.options.output) == this.selected) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks['selected_source'] = {
			label: 'Change background color by route to selected destination',
			description: 'If the input specified is in use by the selected output specified, change background color of the bank',
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: this.rgb(0,0,0)
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: this.rgb(255,255,255)
				},
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: '0',
					choices: this.CHOICES_INPUTS
				}
			],
			callback: (feedback, bank) => {
				if (true) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		this.setFeedbackDefinitions(feedbacks);
	}*/

	setVariable(name, value) {
		// var changed = this.variables[name] !== value;
		this.variables[name] = value;
		super.setVariable(name, value);
	}

	setDefaultValues3Color() {
		this.setVariable('color_matching_3c_red', DEFAULT_COLOR_RED);
		this.setVariable('color_matching_3c_green', DEFAULT_COLOR_GREEN);
		this.setVariable('color_matching_3c_blue', DEFAULT_COLOR_BLUE);
	}

	setDefaultValues7Color() {
		this.setVariable('color_matching_7c_red', DEFAULT_COLOR_RED);
		this.setVariable('color_matching_7c_green', DEFAULT_COLOR_GREEN);
		this.setVariable('color_matching_7c_blue', DEFAULT_COLOR_BLUE);
		this.setVariable('color_matching_7c_cyan', DEFAULT_COLOR_CYAN);
		this.setVariable('color_matching_7c_magenta', DEFAULT_COLOR_MAGNETA);
		this.setVariable('color_matching_7c_yellow', DEFAULT_COLOR_YELLOW);
		this.setVariable('color_matching_7c_white', DEFAULT_COLOR_WHITE);
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
			name: 'power'
		});
		this.setVariable('power', undefined);

		variables.push({
			label: 'Shutter state',
			name: 'shutter'
		});
		this.setVariable('shutter', undefined);

		variables.push({
			label: 'Freeze state',
			name: 'freeze'
		});
		this.setVariable('freeze', undefined);

		variables.push({
			label: 'Input',
			name: 'input'
		});
		this.setVariable('input', '');

		variables.push({
			label: 'Lamp state',
			name: 'lamp_state'
		});
		this.setVariable('lamp_state', undefined);

		variables.push({
			label: 'Brightness',
			name: 'brightness'
		});
		this.setVariable('brightness', 100);

		variables.push({
			label: 'Test Pattern',
			name: 'test_pattern'
		});
		this.setVariable('test_pattern', ntcontrol.TestPattern.Off);

		variables.push({
			label: 'Color Matching Mode',
			name: 'color_matching'
		});
		this.setVariable('color_matching', ntcontrol.ColorMatching.Off);

		variables.push({
			label: 'Color Matching 3-Colors: Red',
			name: 'color_matching_3c_red'
		});

		variables.push({
			label: 'Color Matching 3-Colors: Green',
			name: 'color_matching_3c_green'
		});

		variables.push({
			label: 'Color Matching 3-Colors: Blue',
			name: 'color_matching_3c_blue'
		});

		variables.push({
			label: 'Color Matching 7-Colors: Red',
			name: 'color_matching_7c_red'
		});

		variables.push({
			label: 'Color Matching 7-Colors: Green',
			name: 'color_matching_7c_green'
		});

		variables.push({
			label: 'Color Matching 7-Colors: Blue',
			name: 'color_matching_7c_blue'
		});

		variables.push({
			label: 'Color Matching 7-Colors: Cyan',
			name: 'color_matching_7c_cyan'
		});

		variables.push({
			label: 'Color Matching 7-Colors: Magenta',
			name: 'color_matching_7c_cyan'
		});

		variables.push({
			label: 'Color Matching 7-Colors: Yellow',
			name: 'color_matching_7c_yellow'
		});

		variables.push({
			label: 'Color Matching 7-Colors: White',
			name: 'color_matching_7c_white'
		});
		
		this.setDefaultValues3Color();
		this.setDefaultValues7Color();

		this.setVariableDefinitions(variables);
	}
}
exports = module.exports = instance;