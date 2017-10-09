
	function $ajax(url,params,callbacks){
		if( !callbacks ){callbacks = {};}
		var method = 'GET';
		var rnd = Math.floor(Math.random() * 10000);
		
		var postdata = false;
		if( params && !params._data && !params._cache ){
			params = {'_data':params};
		}
		if( params._data ){
			method = 'POST';
			switch( true ){
				case ($is.object(params._data)):postdata = new FormData();for( var a in params._data ){postdata.append(a,params._data[a]);}break;
				case ($is.element(params._data) && params._data.tagName && params._data.tagName == 'FORM'):postdata = new postdata(params._data);break;
				default:postdata = params._data;
			}
		}

		if( !params._cache ){
			url += ( url.indexOf('?') > 0 ? '&' : '?' ) + 'rnd=' + rnd;
		}

		var xhr = new XMLHttpRequest();
		xhr.open(method,url,true);
		if( !params._binary ){
			xhr.onreadystatechange = function(){
				if(callbacks.onEnd && xhr.readyState == XMLHttpRequest.DONE){return callbacks.onEnd(xhr.responseText);}
			}
		}else{
			xhr.responseType = 'arraybuffer';
			xhr.onload = function(oEvent){
				if( callbacks.onEnd ){
					return callbacks.onEnd(xhr.response,xhr.getAllResponseHeaders());
				}
			};
		}
		//if(!$is.formData(postdata)){xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');//}
		xhr.send(postdata);

		if(callbacks.onUpdate){var offset = 0;var timer = setInterval(function(){
			if(xhr.readyState == XMLHttpRequest.DONE){clearInterval(timer);}
			var text = xhr.responseText.substr(offset);
			if(!$is.empty(text)){var cmds = text.split("\n");$each(cmds,function(k,v){
				if($is.empty(v)){return false;}
				callbacks.onUpdate(v);
			});}
			offset = xhr.responseText.length;
		},1000);}
	}

	if( typeof $is == 'undefined' ){
		var $is = {
			set:      function(o,path){
				var stone;
				path = path || '';
				if( path.indexOf('[') !== -1 ){throw new Error('Unsupported object path notation.');}
				path = path.split('.');
				do{
					if( o === undefined ){return false;}
					stone = path.shift();
					if( !o.hasOwnProperty(stone) ){return false;}
					o = o[stone];
				}while( path.length );
				return true;
			},
			empty:    function(o){if(!o || ($is.string(o) && o == '') || ($is.array(o) && !o.length)){return true;}return false;},
			array:    function(o){return (Array.isArray(o) || typeof o.length === 'number');},
			string:   function(o){return (typeof o == 'string' || o instanceof String);},
			object:   function(o){return (o.constructor.toString().indexOf('function Object()') == 0);},
			element:  function(o){return (!$is.string(o) && 'nodeType' in o && o.nodeType === 1 && 'cloneNode' in o);},
			function: function(o){if(!o){return false;}return (o.constructor.toString().indexOf('function Function()') == 0);},
			formData: function(o){return (o.constructor.toString().indexOf('function FormData()') == 0);}
		};
	}








