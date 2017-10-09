
	function _popup(){
		this.load();
	};
	_popup.prototype.load = function(){
		this.elem_downloads = document.querySelector('ul.downloads');
		this.elem_candidate = document.querySelector('div.candidate');

		/* INI-Close buttons */
		var nodeList = Array.prototype.slice.call(document.querySelectorAll('.btn-close'));
		if( nodeList.length ){
			nodeList.forEach(function(v,k){
				v.addEventListener('click',function(e){
					this.close();
				}.bind(this));
			}.bind(this));
		}
		/* END-Close buttons */

		var key, data;
		for( var i = 0; i < localStorage.length; i++ ){
			key = localStorage.key(i);
			if( key.startsWith('stream-downloader-file-') ){
				data = localStorage.getItem(key);
				data = JSON.parse(data);
				this._node(data);
			}
			if( key == 'stream-downloader-candidate' ){
				data = localStorage.getItem(key);
				data = JSON.parse(data);
				this.candidate(data);
			}
		}
	};
	_popup.prototype.close = function(){
		window.close();
	};
	_popup.prototype.candidate = function(params){
		if( !$is.set(params,'hash') ){return false;}
		if( params.hash && (localStorage['stream-downloader-file-' + params.hash]) ){
			//FIXME: o al menos indicar que ya está descargándose
			return false;
		}

		var node = document.createElement('DIV');

		var h2 = document.createElement('H2');
		h2.innerHTML = '<span>' + params.name + ' (' + params.hash + ')</span>';
		node.appendChild(h2);

		var btn_group = document.createElement('DIV');
		btn_group.classList.add('btn-group');
		btn_group.classList.add('right');
		node.appendChild(btn_group);

		btn_group.innerHTML += '<div class="btn download bg-blue nowrap"><i class="fa fa-cloud-download" aria-hidden="true"></i> Enqueue</div>'
			;
		var btn_download = node.querySelector('.btn.download');
		btn_download.addEventListener('click',function(){
			//FIXME: hay que eliminar el nodo
			var message = {
				 'command':'download.add'
				,'data':params
			};
			chrome.runtime.sendMessage(message,function(resp){
				this.elem_candidate.removeChild(node);
			}.bind(this));
		}.bind(this));

		this.elem_candidate.innerHTML = '';
		this.elem_candidate.appendChild(node);
	};
	_popup.prototype._node = function(params){
		if( !$is.set(params,'hash') ){return false;}
		var download = document.createElement('LI');
		download.setAttribute('id','download-' + params.hash);
		download.classList.add('download-node');

		var file = document.createElement('DIV');
		file.classList.add('image');
		file.innerHTML = '<div class="file"><div><div><i class="fa fa-align-left" aria-hidden="true"></i></div></div></div>';
		download.appendChild(file);

		var wrapper = document.createElement('DIV');
		wrapper.classList.add('wrapper');
		download.appendChild(wrapper);

		var h2 = document.createElement('H2');
		h2.innerHTML = params.name + ' (' + params.hash + ')';
		wrapper.appendChild(h2);

		wrapper.innerHTML += '<div class="progress-thin"><progress value="0" max="100"></progress></div>';
		var progress = wrapper.querySelector('progress');

		var info = document.createElement('P');
		info.classList.add('information');
		info.innerHTML = '<span class="info-perc"></span>'
			+ '<span class="info-down">' + this.humanFileSize(params.down) + '</span>'
			+ '<span>/</span>'
			+ '<span class="info-total">' + this.humanFileSize(params.total) + '</span>';
		wrapper.appendChild(info);

		var btn_group = document.createElement('DIV');
		btn_group.classList.add('btn-group');
		btn_group.classList.add('right');
		btn_group.classList.add('mini');
		wrapper.appendChild(btn_group);

		btn_group.innerHTML += ''
			+ '<div class="btn save hidden"><i class="fa fa-floppy-o" aria-hidden="true"></i> Save File</div>'
			+ '<div class="btn resume hidden"><i class="fa fa-play" aria-hidden="true"></i> Resume</div>'
			+ '<div class="btn retry hidden"><i class="fa fa-refresh" aria-hidden="true"></i> Resume</div>'
			+ '<div class="btn cancel"><i class="fa fa-times" aria-hidden="true"></i> Remove</div>'
		+ '';
		//console.log(params);

		var btn_cancel = wrapper.querySelector('.btn.cancel');
		var btn_save   = wrapper.querySelector('.btn.save');
		var btn_retry  = wrapper.querySelector('.btn.retry');
		var btn_resume = wrapper.querySelector('.btn.resume');
		btn_retry.addEventListener('click',function(){
			var url = 'http://streamcloud.eu/' + params.hash + '/';
			chrome.tabs.create({'url':url},function(){});
		});
		btn_cancel.addEventListener('click',function(){
			//FIXME: hay que eliminar el nodo
			var message = {
				 'command':'download.cancel'
				,'data':params
			};
			
			chrome.runtime.sendMessage(message);
		});
		btn_save.addEventListener('click',function(){
			var message = {
				 'command':'download.save'
				,'data':params
			};
			
			chrome.runtime.sendMessage(message);
		});
		btn_resume.addEventListener('click',function(){
			var message = {
				 'command':'download.add'
				,'data':params
			};
			
			chrome.runtime.sendMessage(message);
		});

		this.elem_downloads.appendChild(download);
		this.update(params);
	};
	_popup.prototype.humanFileSize = function(size){
		if( size == false ){return 0;}
		var i = Math.floor( Math.log(size) / Math.log(1024) );
		return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
	};
	_popup.prototype._node_remove = function(hash){
		if( !hash
		 || !(this.tmp = document.querySelector('#download-' + hash)) ){return false;}

		this.tmp.parentNode.removeChild(this.tmp);
	};
	_popup.prototype.update = function(params){
		if( !params.hash
		 || !(this.node = document.querySelector('#download-' + params.hash)) ){
			/* Puede ser un nuevo valor incorporándose a la cola */
			return this._node(params);
		}
		var btn_group = this.node.querySelector('.btn-group');
		var btn_retry = btn_group.querySelector('.retry');

		btn_retry.classList.add('hidden');
		var tmp = false;

		if( params.total && params.down ){
			var progress = this.node.querySelector('progress');
			var perc = params.down / params.total * 100;
			progress.value = perc;
		}

		if( params.total ){
			var info = this.node.querySelector('.info-total');
			info.innerHTML = this.humanFileSize(params.total);
		}

		if( params.down ){
			var info = this.node.querySelector('.info-down');
			info.innerHTML = this.humanFileSize(params.down);
		}

		if( params.total && params.down ){
			var info = this.node.querySelector('.info-perc');
			var perc = params.down / params.total * 100;
			info.innerHTML = Math.round(perc) + '%';
		}

		var btn_cancel = this.node.querySelector('.btn.cancel');
		var btn_save   = this.node.querySelector('.btn.save');
		var btn_retry  = this.node.querySelector('.btn.retry');
		var btn_resume = this.node.querySelector('.btn.resume');
		if( params.status ){
			btn_save.classList.add('hidden');
			btn_resume.classList.add('hidden');
			switch( params.status ){
				case 'paused':
					btn_resume.classList.remove('hidden');
					break;
				case 'merging':
					if( !this.node.classList.contains('merging') ){
						this.node.classList.add('merging');
					}
					break;
				case 'finished':
					btn_save.classList.remove('hidden');
					if( this.node.classList.contains('merging') ){
						this.node.classList.remove('merging');
					}
			}
		}

		if( params.status 
		 && params.status == 'removing' ){
			if( !this.node.classList.contains('removing') ){
				this.node.classList.add('removing');
			}
		}

		if( params.status 
		 && params.status == 'error' ){
			if( !this.node.classList.contains('error') ){
				this.node.classList.add('error');
			}
			btn_retry.classList.remove('hidden');
		}
	};

	function extension_init(){
		popup = new _popup();
	}

	addEventListener('DOMContentLoaded',function(e){extension_init();});
	if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive') {
		extension_init();
	}

	addEventListener('storage',function(e){
		//console.log(e);
		if( e.key.startsWith('stream-downloader-file-') ){
			if( !e.newValue ){
				data = e.oldValue;
				data = JSON.parse(data);
				popup._node_remove(data.hash);
				return true;
			}
			data = e.newValue;
			data = JSON.parse(data);
			popup.update(data);
			return true;
		}
	});
