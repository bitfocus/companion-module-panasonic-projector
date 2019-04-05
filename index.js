var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var crypto = require('crypto');
var debug;
var log;

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

		this.data = [];
		this.data['lastCommand'] = "authentication";

		this.inputs = [
			{ id: 'RG1', label: 'RGB1' },
			{ id: 'RG2', label: 'RGB2' },
			{ id: 'VID', label: 'Video' },
			{ id: 'HD1', label: 'HDMI' },
			{ id: 'DVI', label: 'DVI' },
			{ id: 'SD1', label: 'SDI' },
			{ id: 'DL1', label: 'Digital Link' },
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
	actions(system) {
		var actions = {};

		actions['projector_on'] = {
			label: 'Turn On Projector'
		};

		actions['projector_off'] = {
			label: 'Turn Off Projector'
		};

		actions['shutter_on'] = {
			label: 'Shutter The Projector'
		};

		actions['shutter_off'] = {
			label: 'Unshutter The Projector'
		};

		actions['input_source'] = {
			label: 'Change The Input Source',
			options: [
				{
					type: 'dropdown',
					label: 'Input Source',
					id: 'source',
					default: '0',
					choices: this.inputs
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
		if (this.socket !== undefined) {
			this.socket.destroy();
		}

		debug("destroy", this.id);
	}

	/**
	 * INTERNAL: returns the authentication string.
	 *
	 * @param {string} salt - The provided authentication salt.
	 * @returns {string} Returns the token.
	 * @access protected
	 * @since 1.1.0
	 */
	getToken(salt) {
		return crypto.createHash('md5').update(this.config.user+":"+this.config.pass+":"+salt).digest("hex");
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
		log = this.log;

		//this.initVariables();
		//this.initFeedbacks();
	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	init_tcp(cmd) {
		var receivebuffer = '';

		if (this.socket !== undefined) {
			this.socket.destroy();
			delete this.socket;
		}

		if (this.config.port === undefined) {
			this.config.port = 1024;
		}

		if (this.config.host) {
			this.socket = new tcp(this.config.host, this.config.port);

			this.socket.on('error', (err) => {
				debug("Network error", err);
				this.log('error',"Network error: " + err.message);
			});

			this.socket.on('connect', () => {
				debug("Connected");
			});

			// separate buffered stream into lines with responses
			this.socket.on('data', (chunk) => {
				var i = 0, line = '', offset = 0;
				receivebuffer += chunk;
				line = receivebuffer.toString();
				console.log(receivebuffer.toString());
				if (line.substring(0, 12) == "NTCONTROL\x20\x31\x20") {
					console.log("recognized login");
					console.log(line.substring(12, 20));
					console.log("sending: "+this.getToken(line.substring(12, 20)) + "\x30\x30" + cmd + "\x0d")
					this.socket.send(this.getToken(line.substring(12, 20)) + "\x30\x30" + cmd + "\x0d");
				}else{
					console.log("recognized no login");
					this.socket.send("\x30\x30" + cmd + "\x0d");
				}
			});
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
		var cmd;
		var opt = action.options;

		switch (action.action) {
			case 'projector_on':
				this.init_tcp("PON");
				break;
			case 'projector_off':
				this.init_tcp("POF");
				break;
			case 'shutter_on':
				this.init_tcp("OSH:1");
				break;
			case 'shutter_off':
				this.init_tcp("OSH:0");
				break;
			case 'input_source':
				this.init_tcp("IIS:"+opt.source);
				break;
		}

		if (cmd !== undefined) {

			if (this.socket !== undefined && this.socket.connected) {
				this.socket.send(cmd);
			}
			else {
				debug('Socket not connected :(');
			}
		}
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

	/**
	 * INTERNAL: initialize variables.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	 /*
	initVariables() {
		var variables = [];

		variables.push({
			label: 'Label of input ',
			name: 'input_'
		});
		this.setVariable('input_', "name");

		variables.push({
			label: 'Label of selected destination',
			name: 'selected_destination'
		});

		variables.push({
			label: 'Label of input routed to selection',
			name: 'selected_source'
		});

		this.setVariableDefinitions(variables);
	}*/

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 1.0.0
	 */
	updateConfig(config) {
		var resetConnection = false;
		
		if (this.config.host != config.host)
		{
			resetConnection = true;
		}

		this.config = config;
	}
}
exports = module.exports = instance;