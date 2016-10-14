var fs = require('fs');

function Storage(file){
	this._indexes = [];
	this._file = file;
	reads = require(file);
	for(var i in reads){
    	if(i.indexOf('_') !== 0){
    		this._indexes.push(i);
    		this[i] = reads[i];
        }
    }
}

Storage.prototype.save = function(){
	writes = {};
	for(var i=0; i < this._indexes.length; i++){
    	j = this._indexes[i];
    	writes[j] = this[j];
    }
	fs.writeFile(this._file, JSON.stringify(writes), function(err){ if (err) throw err; });
}

Storage.prototype.add = function(ind, val){
	this[ind] = val;
	if(this._indexes.indexOf(ind) === -1) this._indexes.push(ind);
	writes = {};
	for(var i=0; i < this._indexes.length; i++){
    	j = this._indexes[i];
    	writes[j] = this[j];
    }
	fs.writeFile(this._file, JSON.stringify(this), function(err){ if (err) throw err; });
}

Storage.prototype.remove = function(ind){
	if(this._indexes.indexOf(ind) !== -1){
    	this._indexes.splice(this._indexes.indexOf(ind), 1);
    	delete this[ind];
    } else return;
	writes = {};
	for(var i=0; i < this._indexes.length; i++){
    	j = this._indexes[i];
    	writes[j] = this[j];
    }
	fs.writeFile(this._file, JSON.stringify(this), function(err){ if (err) throw err; });
}

module.exports = Storage;
