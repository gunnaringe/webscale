var HID = require('node-hid');
var util = require('util');
var events = require('events');

function WebScale(deviceIndex=0, vendorId=9332, productId=1360){
    this._deviceIndex = deviceIndex;
    this._vendorId = vendorId;
    this._productId = productId;
    this._prevWeight = null;
    this._device = null;

    this._connectWithRetry();
}

util.inherits(WebScale, events.EventEmitter);

WebScale.prototype.disconnect = function(){
    if(this._device){
	this.emit('disconnected');
	this._device.close();
	this._device = null;
    }
};

WebScale.prototype._connectWithRetry = function(){
    try {
	this._connect();
    } catch(e){
	setTimeout(this._connectWithRetry.bind(this), 2000);
    }
};

WebScale.prototype._connect = function(){
    var devices = HID.devices(this._vendorId, this._productId);

    if(!devices.length || !devices[this._deviceIndex]){
	this.emit('disconnected');
	throw new Error('could not find device');
    }

    var devicePath = devices[this._deviceIndex].path;
    try {
	this._device = new HID.HID(devicePath);
    } catch(e){
	this.emit('disconnected');
	throw e;
    }
    this._onConnect(this._device);
};

WebScale.prototype._onConnect = function(device){
    this.emit('connected');
    device.on('data', this._onData.bind(this));
    device.on('error', this._onError.bind(this));
};

WebScale.prototype._onData = function(data){
    var ounces = data.readInt16LE(4)/10;

    if(this._prevWeight !== ounces){
	this._prevWeight = ounces;
	this.emit('change:weight', ounces);
    }
};

WebScale.prototype._onError = function(error){
    if(error.message == 'could not read from HID device'){
	this.emit('disconnected', error);
	this._connectWithRetry();
    } else {
	this.emit('error', error);
    }
};

module.exports = WebScale;
