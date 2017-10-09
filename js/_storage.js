
	var _storages = function(db){
		this.db = db;
	};
	_storages.prototype.close = function(path){
		this._db.close();
		this._db = false;
	};
	_storages.prototype.names = function(){
		return new Promise(function (resolve, reject) {
			this.open()
			.then(function(event){
				resolve(this._db.objectStoreNames);
				this.close();
			}.bind(this),reject);
		}.bind(this));
	}

	var _storage = function(db,table){
		this._db = false;
		this.db = db;
		this.table = table || db;
		this.version = 1;
		this.isOpen = false;
	};
	_storage.prototype.open = function(debug){
		return new Promise(function (resolve, reject) {
			if( this._db ){return resolve({});}

			this._open = indexedDB.open(this.db,this.version);
			this._open.onblocked = function(event) {
				console.log('blocked');
				return reject(event);
			};
			this._open.onupgradeneeded = function() {
				this._db = this._open.result;
				var store = this._db.createObjectStore(this.table);
				var index = store.createIndex('path','path',{ unique: false });
				var index = store.createIndex('file',['path','name'],{ unique: true });
			}.bind(this);
			this._open.onsuccess = function(event) {
				this._db = this._open.result;
				if( !this._db.objectStoreNames.contains(this.table) ){
					this.version = parseInt(this._db.version) + 1;
					if( this._db ){
						this._db.close();
						this._db = false;
					}
					return this.open().then(resolve, reject);
				}
				resolve(event);
			}.bind(this);
			this._open.onerror = function(event) {
				if( (this.tmp = (event.target.error + '').match(/The requested version .*? is less than the existing version \(([0-9]+)\)./)) ){
					this.version = this.tmp[1];
					if( this._db ){
						this._db.close();
						this._db = false;
					}
					return this.open().then(resolve, reject);
				}
				reject(event);
			}.bind(this);
		}.bind(this));
	};
	_storage.prototype.close = function(path){
		this._db.close();
		this._db = false;
	};
	_storage.prototype.drop = function(){
		return new Promise(function (resolve, reject) {
			this.open()
			.then(function(event){
				this._db.deleteObjectStore(this.table);
				this.close();
				resolve(event);
			}.bind(this),function(event){
				reject(event);
			});
		}.bind(this));
	};
	_storage.prototype.path = function(path){
		if( !path ){return false;}
		fileName = '';
		if( path[path.length - 1] !== '/' ){
			fileName = path.split('\\').pop().split('/').pop();
			if( !fileName ){return false;}
			filePath = path.substr(0,path.length - fileName.length);
		}
		if( filePath[0] !== '/' ){filePath = '/' + filePath;}
		if( filePath[filePath.length -1] !== '/' ){filePath = filePath + '/';}

		return {'path':filePath,'name':fileName,'isDir':(!fileName)};
	};
	_storage.prototype.file = function(path){
		return new Promise(function (resolve, reject) {
			var file = this.path(path);
			if( file === false ){return reject({'error':'INVALID_FILE'});}

			this.open()
			.then(function(event){
				var transaction = this._db.transaction([this.table],'readonly');
				transaction.oncomplete = function(event) {resolve(transaction);};
				transaction.onerror = function(event) {reject(event);};

				var objectStore = transaction.objectStore(this.table);
				var index = objectStore.index('file');
				var request = index.get([file.path,file.name]);
				request.onsuccess = function(event) {
					if( !request.result ){
						/* The file not exists but there is no error */
						return reject(event);
					}
					resolve(request.result);
				};
			}.bind(this),function(event){
				reject(event);
			});
		}.bind(this));
	};
	_storage.prototype.remove = function(path){
		return new Promise(function (resolve, reject) {
			var file = this.path(path);
			if( file === false ){return reject({'error':'INVALID_FILE'});}

			this.open()
			.then(function(event){
				var transaction = this._db.transaction([this.table],'readwrite');
				transaction.oncomplete = function(event) {resolve(transaction);};
				transaction.onerror = function(event) {reject(event);};

				var objectStore = transaction.objectStore(this.table);
				var index = objectStore.index('file');
				var request = index.openKeyCursor([file.path,file.name]);
				request.onsuccess = function(event) {
					if( request.result ){
						objectStore.delete(request.result.primaryKey);
					}else{
						resolve(event);
					}
				};
			}.bind(this),function(event){
				reject(event);
			});
		}.bind(this));
	};
	_storage.prototype.folder = function(path,cb){
		return new Promise(function (resolve, reject) {
			this.open()
			.then(function(event){
				var transaction = this._db.transaction([this.table],'readonly');
				transaction.oncomplete = function(event) {resolve(transaction);};
				transaction.onerror = function(event) {reject(event);};

				var objectStore = transaction.objectStore(this.table);
				var index = objectStore.index('path');
				var request_count = index.count(path);
				request_count.onsuccess = function(event) {
					if( !request_count.result ){
						reject({'error':'INVALID_FOLDER'});
					}

					var request = index.openCursor(path);
					request.onsuccess = function(event) {
						if( request.result ) {
							cb(request.result.value);
							request.result.continue();
						}else{
							resolve(event);
						}
					};
				};
			}.bind(this),function(event){
				reject(event);
			});
		}.bind(this));
	}; 
	_storage.prototype.store = function(path,content){
		return new Promise(function (resolve, reject) {
			var file = this.path(path);
			if( file === false ){return reject({'error':'INVALID_FILE'});}

			this.open()
			.then(function(event){
				var transaction = this._db.transaction([this.table],'readwrite');
				transaction.oncomplete = function(event) {
					resolve(transaction);
				};
				transaction.onerror = function(event) {
					reject(event);
				};

				var objectStore = transaction.objectStore(this.table);
				file.content = content;
				var request = objectStore.put(file,file.path + file.name);
				request.onsuccess = function(event) {
					resolve(request.result);
				};
			}.bind(this),function(event){
				reject(event);
			});
		}.bind(this));
	};
