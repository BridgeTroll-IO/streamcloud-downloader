	window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
	var _downloads = {}
	var _file_storage = new _storage('streamcloud-downloader');
	var _finished = 0;

	var _init = function(){
		/* Vamos a echar un vistazo a ver lo que hay */
		var data;
		for( var i = 0; i < localStorage.length; i++ ){
			key = localStorage.key(i);
			if( key.startsWith('stream-downloader-file-') ){
				data = localStorage.getItem(key);
				data = JSON.parse(data);
				if( data.status && data.status == 'finished' ){_finished++;}
				_downloads[data.hash] = new _download(data.hash,data.video,data);
			}
		}

		/* Inicializamos el contador de las descargas que han finalizado */
		chrome.browserAction.setBadgeText({'text':_finished + ''});
	}

	var _download = function(hash,video,params){
		if( !params ){params = {};}
		this.hash  = hash;
		this.video = video;
		this.tmp   = false;
		this.xhr   = false;
		this.abort = false;
		this.chunk_size = 1024 * 1024; /* 1M */
		this.file = 0;
		this.files_total = 0;

		this.data = {
			 'hash': this.hash
			,'video': this.video
			,'name': false
			,'total': false
			,'down': false
			,'finished': false
			,'status': 'paused'
		};
		if( (this.tmp = localStorage.getItem('stream-downloader-file-' + this.hash)) ){
			this.data = JSON.parse(this.tmp);
			this.files_total = Math.ceil(this.data.total / this.chunk_size);
			if( this.data.down != this.data.total ){
				this.data.status = 'paused';
			}
		}
		if( params.name ){this.data.name = params.name;}
		localStorage.setItem('stream-downloader-file-' + this.hash,JSON.stringify(this.data));

		this.blob = [];
		//this.chunk();
		//this.merge();
	};
	_download.prototype.remove = function(){
		this.abort = true;

		/* Cleanup */
		this.data.status = 'removing';
		localStorage.setItem('stream-downloader-file-' + this.hash,JSON.stringify(this.data));

		if( this.xhr ){
			//FIXME: probar
			try{
				this.xhr.abort();
			}catch(e){}
		}

		var items = [];
		_file_storage.folder('/' + this.hash + '/',function(item){
			items.push(_file_storage.remove(item.path + item.name));
		}).then(function(){
			Promise.all(items).then(function(){
				_file_storage.folder('/' + this.hash + '/',function(item){
					console.log('esto no debería ocurrir');
					console.log(item.path + item.name);
				}).then(function(){
					console.log('algo va mal');
					return this.remove();
				}.bind(this),function(event){
					/* Todo correcto */
					if( event.error
					 && event.error == 'INVALID_FOLDER' ){
						localStorage.removeItem('stream-downloader-file-' + this.hash);
						if( this.data.status == 'finished' ){
							/* Actualizamos el indicador */
							_finished--;
							chrome.browserAction.setBadgeText({'text':_finished + ''});
						}
						delete _download[this.hash];
					}
				}.bind(this));
			}.bind(this));
		}.bind(this),function(event){
			if( event.error
			 && event.error == 'INVALID_FOLDER' ){
				localStorage.removeItem('stream-downloader-file-' + this.hash);
				if( this.data.status == 'finished' ){
					/* Actualizamos el indicador */
					_finished--;
					chrome.browserAction.setBadgeText({'text':_finished + ''});
				}
				delete _download[this.hash];
			}
		}.bind(this));
	};
	_download.prototype.mark_error = function(){
		this.data.status = 'error';
		localStorage.setItem('stream-downloader-file-' + this.hash,JSON.stringify(this.data));
	};
	_download.prototype.mark_finished = function(){
		chrome.notifications.create('',{
			type: 'basic',
			iconUrl: 'images/logo.128.png',
			title: this.data.name,
			message: 'Download finished'
		});

		this.data.status = 'finished';
		this.data.down = this.data.total;
		localStorage.setItem('stream-downloader-file-' + this.hash,JSON.stringify(this.data));

		/* Actualizamos el indicador */
		_finished++;
		chrome.browserAction.setBadgeText({'text':_finished + ''});

		this.merge();
	};
	_download.prototype.merge = function(){
		/* Generamos el fichero */
		this.data.status = 'merging';
		localStorage.setItem('stream-downloader-file-' + this.hash,JSON.stringify(this.data));

		_file_storage.folder('/' + this.hash + '/',function(item){
			this.blob.push(item.content);
		}.bind(this)).then(function(item){
			var blob = new Blob(this.blob,{type:'application/x-download'});

			this.data.status = 'finished';
			localStorage.setItem('stream-downloader-file-' + this.hash,JSON.stringify(this.data));

			if( window.navigator.msSaveOrOpenBlob ){
				window.navigator.msSaveBlob(blob, filename);
			}else{
				chrome.downloads.download({
					url: window.URL.createObjectURL(blob),
					filename: this.data.name + '.mp4'
				});
			}
		}.bind(this),console.log);
	};
	_download.prototype.chunk = function(){
		if( this.abort ){return false;}
		if( this.data.status == 'finished' ){
			/* Download complete */
			this.data.down = this.data.total;
			localStorage.setItem('stream-downloader-file-' + this.hash,JSON.stringify(this.data));
			return false;
		}
		var rangeStart = this.file * this.chunk_size;
		var rangeEnd   = rangeStart + (this.chunk_size - 1);

		this.data.down = rangeStart;
		this.data.status = 'downloading';
		localStorage.setItem('stream-downloader-file-' + this.hash,JSON.stringify(this.data));

		/* Vamos a comprobar primero si el fichero existe */
		var targetFile = '/' + this.hash + '/' + (this.file + '').padStart(8,'0') + '.blob';
		_file_storage.file(targetFile).then(function(event){
			/* Ya tenemos el fichero, paramos al siguiente */
			var current = (this.file + 1);
			console.log('Tengo el fichero (cache) ' + current + '/' + this.files_total);
			var hasNextChunk = ( current < this.files_total );
			if( hasNextChunk ){
				this.file++;
				setTimeout(function(){
					this.chunk();
				}.bind(this),500);
			}else{
				this.mark_finished();
			}
		}.bind(this),function(){
			/* Si no existe, lo descargamos */
			this.xhr = new XMLHttpRequest();
			this.xhr.open('GET',this.video);
			this.xhr.setRequestHeader('Range','bytes=' + rangeStart + '-' + rangeEnd);
			this.xhr.responseType = 'arraybuffer';
			this.xhr.onerror = function(e){
				console.log('error al descargar');
				this.mark_error();
			}.bind(this);
			this.xhr.onload = function(e){
				var headers = this.xhr.getAllResponseHeaders();
				//console.log(headers);
				if( this.data.total == false 
				 && (this.tmp = headers.match(/content\-range: bytes [0-9]+\-[0-9]+\/([0-9]+)/i)) ){
					this.data.total = this.tmp[1];
					this.files_total = Math.ceil(this.data.total / this.chunk_size);

					/* Almacenamos el tamaño total en storage */
					localStorage.setItem('stream-downloader-file-' + this.hash,JSON.stringify(this.data));

					console.log('obtenido size: ' + this.data.total);
				}
				if( this.data.total == false ){
					console.log('cant get size');
					this.mark_error();
				}

				if( this.data.total == 7 ){
					var enc   = new TextDecoder();
					var error = enc.decode(this.xhr.response);
					console.log(enc.decode(this.xhr.response));
					if( error == 'No File'
					 || error == 'Expired' ){
						this.mark_error();
						return false;
					}
					/* Pueden ser 7 bytes legítimos */
				}

				var hasNextChunk = true;
				if( !(this.tmp = headers.match(/content\-length: ([0-9]+)/i))
				 || this.tmp[1] < 1048576 ){
					//FIXME: esto es en realidad chunksize
					hasNextChunk = false;
				}

				_file_storage.store('/' + this.hash + '/' + (this.file + '').padStart(8,'0') + '.blob',this.xhr.response).then(function(){
					console.log('Tengo el fichero ' + (this.file + 1) + '/' + this.files_total);
					this.file++;
					if( hasNextChunk ){
						setTimeout(function(){
							this.chunk();
						}.bind(this),500);
					}else{
						this.mark_finished();
					}
				}.bind(this),function(e){
					console.log('fail',e);
				});
				return false;
			}.bind(this);
			this.xhr.send();
		}.bind(this));

	}

	_init();

	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		if( message.command ){switch( message.command ){
			case 'candidate.add':
				/* Se supone que en 'data' vendrá el candidato */
				localStorage.setItem('stream-downloader-candidate',JSON.stringify(message.data));
				break;
			case 'candidate.exists':
				var current  = localStorage.getItem('stream-downloader-candidate');
				var response = !!(_downloads[message.data.hash]) ? _downloads[message.data.hash].data.status : false;
				sendResponse(response);
				break;
			case 'download.add':
				var params = {};
				_downloads[message.data.hash] = new _download(message.data.hash,message.data.video,message.data);
				_downloads[message.data.hash].chunk();
				break;
			case 'download.save':
				if( !_downloads[message.data.hash] ){
					/* Algo es algo */
					_downloads[message.data.hash] = new _download(message.data.hash,message.data.video,message.data);
				}
				_downloads[message.data.hash].merge();
				break;
			case 'download.cancel':
				if( !_downloads[message.data.hash] ){
					/* Algo es algo */
					_downloads[message.data.hash] = new _download(message.data.hash,message.data.video,message.data);
				}
				_downloads[message.data.hash].remove();
				delete _downloads[message.data.hash];
				break;
			default:
				alert(message.command);
		}}
	});
