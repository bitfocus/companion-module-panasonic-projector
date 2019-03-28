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

		this.setupChoices();

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
					id: 'serial',
					default: '0',
					choices: this.CHOICES_SERIALS
				}
			]
		};

		this.setActions(actions);
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
			case 'route':

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
				default:"1024"
			},
			{
				type: 'textinput',
				id: 'user',
				width: 6,
				label: 'Username'
			},
			{
				type: 'textinput',
				id: 'pass',
				width: 6,
				label: 'Password'
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
		self.data['salt'] = salt;
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

		this.initVariables();
		this.initFeedbacks();

		this.init_tcp();
	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	init_tcp() {
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

			this.socket.on('status_change', (status, message) => {
				this.status(status, message);
			});

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

				while ( (i = receivebuffer.indexOf('\n', offset)) !== -1) {
					line = receivebuffer.substr(offset, i - offset);
					offset = i + 1;
					this.socket.emit('receiveline', line.toString());
				}

				receivebuffer = receivebuffer.substr(offset);
			});

			this.socket.on('receiveline', (line) => {
				if (line.length > 0 ) {
						this.processProjectorCommand(line);
				} else {
					debug("weird response from proj", line, line.length);
				}
			});
		}
	}

	/**
	 * INTERNAL: parse projector commands.
	 *
	 * @param {string} line - the command supplied
	 * @access protected
	 * @since 1.0.0
	 */
	processProjectorCommand(line) {
		if (line.substring(0, 12) == "NTCONTROL\x20\x31\x20") { //Preamble indicating the device is in protect

			if (this.socket !== undefined && this.socket.connected) {

				self.data['token'] = getToken(line.substring(13, 21));

			}

		} else if(line.substring(0, 12) == "NTCONTROL\x20\x30\x0d") { //Preamble indicating the device is not in protect, lucky us

			if (this.socket !== undefined && this.socket.connected) {

				self.data['token'] = "";

			}

		} else if(line == "\x30\x30ERRA\x0d"){
			
		} else {
			self.data[self.data['lastCommand']] = line.substring(3, -1);
			self.data[self.data['lastCommandCB']](self.data[self.data['lastCommand']]);
		}
	}

	sendCommand(cmd, cb) {. //TODO: maybe add a command queue? so that we make sure that all commands have to be matched 1:1 with their response?
		self.data['lastCommand'] = cmd;
		self.data['lastCommandCB'] = cb;
		this.socket.send(self.data['token']+"\x30\x30"+cmd+"\x0d");
	}

	/**
	 * INTERNAL: initialize feedbacks.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
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
	}

	/**
	 * INTERNAL: Routes incoming data to the appropriate function for processing.
	 *
	 * @param {string} key - the command/data type being passed
	 * @param {Object} data - the collected data
	 * @access protected
	 * @since 1.0.0
	 */
	processVideohubInformation(key,data) {

		if (key.match(/(INPUT|OUTPUT|MONITORING OUTPUT|SERIAL PORT) LABELS/)) {
			this.updateLabels(key,data);
			this.actions();
			this.initFeedbacks();
		}
		else if (key.match(/(VIDEO OUTPUT|VIDEO MONITORING OUTPUT|SERIAL PORT) ROUTING/)) {
			this.updateRouting(key,data);

			this.checkFeedbacks('input_bg');
			this.checkFeedbacks('selected_source');
		}
		else if (key.match(/(VIDEO OUTPUT|VIDEO MONITORING OUTPUT|SERIAL PORT) LOCKS/)) {
			this.updateLocks(key,data);
		}
		else if (key.match(/(VIDEO INPUT|VIDEO OUTPUT|SERIAL PORT) STATUS/)) {
			this.updateStatus(key,data);
			this.actions();
			this.initFeedbacks();
		}
		else if (key == 'SERIAL PORT DIRECTIONS') {
			this.updateSerialDirections(key,data);
		}
		else if (key == 'VIDEOHUB DEVICE') {
			this.updateDevice(key,data);
			this.actions();
			this.initVariables();
			this.initFeedbacks();
		}
		else {
			// TODO: find out more about the video hub from stuff that comes in here
		}
	}

	/**
	 * INTERNAL: use model data to define the choices for the dropdowns.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	setupChoices() {

		this.CHOICES_INPUTS  = [];
		this.CHOICES_OUTPUTS = [];
		this.CHOICES_SERIALS = [];
		this.CHOICES_INPUTS.push( { id: "key", label: "Label" } );
	}

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

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp();
		}
	}

	/**
	 * INTERNAL: Updates device data from the Videohub
	 *
	 * @param {string} labeltype - the command/data type being passed
	 * @param {Object} object - the collected data
	 * @access protected
	 * @since 1.1.0
	 */
	updateDevice(labeltype, object) {

		for (var key in object) {
			var parsethis = object[key];
			var a = parsethis.split(/: /);
			var attribute = a.shift();
			var value = a.join(" ");

			switch (attribute) {
				case 'Model name':
					this.deviceName = value;
					this.log('info', 'Connected to a ' + this.deviceName);
					break;
				case 'Video inputs':
					this.config.inputCount = value;
					break;
				case 'Video outputs':
					this.config.outputCount = value;
					break;
				case 'Video monitoring outputs':
					this.config.monitoringCount = value;
					break;
				case 'Serial ports':
					this.config.serialCount = value;
					break;
			}
		}

		this.saveConfig();
	}
}
exports = module.exports = instance;