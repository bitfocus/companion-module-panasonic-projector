var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	return self;
}



instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;
	self.status(self.STATUS_UNKNOWN);
	self.actions(); // export actions
	self.init_presets();
}

instance.prototype.updateConfig = function(config) {
	var self = this;
	self.config = config;
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module controls Panasonic DW750'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Projector IP',
			width: 6,
			regex: self.REGEX_IP
		},
		{
			type: 'textinput',
			id: 'user',
			label: 'Username',
		},
		{
			type: 'textinput',
			id: 'pass',
			label: 'Password',
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;
}

instance.prototype.init_presets = function () {
	var self = this;
	var presets = [
		{
			category: 'Lens',
			label: 'Shutter',
			bank: {
				style: 'text',
				text: 'Shutter',
				size: '7',
				color: '16777215',
				bgcolor: self.rgb(0,0,0)
			},
			actions: [
				{
					action: 'shutter',
				}
			]
		}
	];
	self.setPresetDefinitions(presets);
};

instance.prototype.actions = function(system) {
	var self = this;

	self.system.emit('instance_actions', self.id, {
		'shutter':         {
			label: 'Shutter the projector'
		},

		'unshutter':         {
			label: 'Unshutter the projector'
		},
		'power_on':         {
			label: 'Turn on the projector'
		},
		'power_off':         {
			label: 'Turn off the projector'
		}
	});
}

instance.prototype.action = function(action) {
	var self = this;
	var opt = action.options;
	switch (action.action) {

		case 'shutter':
			self.system.emit(
			    'rest_get',
			    'http://'+self.config.host+'/cgi-bin/proj_ctl.cgi?key=shutter_on&lang=e',
			    function (err, data, response) {
			        if (!err) {
			            self.log('Error from Proj: ' + result);
			            return;
			        }
			        console.log("Result from REST: ", result);
			    },
			    {},
			    { 
			        user: self.config.user,
			        password: self.config.pass 
			    }
			);
			break;

		case 'unshutter':
			self.system.emit(
			    'rest_get',
			    'http://'+self.config.host+'/cgi-bin/proj_ctl.cgi?key=shutter_off&lang=e',
			    function (err, data, response) {
			        if (!err) {
			            self.log('Error from Proj: ' + result);
			            return;
			        }
			        console.log("Result from REST: ", result);
			    },
			    {},
			    { 
			        user: self.config.user,
			        password: self.config.pass 
			    }
			);
			break;

		case 'power_on':
			self.system.emit(
			    'rest_get',
			    'http://'+self.config.host+'/cgi-bin/power_on.cgi',
			    function (err, data, response) {
			        if (!err) {
			            self.log('Error from Proj: ' + result);
			            return;
			        }
			        console.log("Result from REST: ", result);
			    },
			    {},
			    { 
			        user: self.config.user,
			        password: self.config.pass 
			    }
			);
			break;

		case 'power_off':
			self.system.emit(
			    'rest_get',
			    'http://'+self.config.host+'/cgi-bin/power_off.cgi',
			    function (err, data, response) {
			        if (!err) {
			            self.log('Error from Proj: ' + result);
			            return;
			        }
			        console.log("Result from REST: ", result);
			    },
			    {},
			    { 
			        user: self.config.user,
			        password: self.config.pass 
			    }
			);
			break;



	}


};

instance_skel.extendedBy(instance);

exports = module.exports = instance;
