
	if( window.location.href.match(/streamcloud.eu/) ){
		var bootstrap = '(' + function(){
			'use strict';

			if( window.open ){
				window._native_open = open;
				window.open = function(url){
					console.log('tried to open in main ' + url);
					//top.location = url;
					return 666;
				};
			}

			window.Notification = {
				'requestPermission': function(){}
			};
		} + ')();';

		var script = document.createElement('script');
		script.setAttribute('id', '__lg_script');
		script.textContent = bootstrap;
		(document.head||document.documentElement).appendChild(script);
		script.remove();

		var elem_veil = false;
		addEventListener('DOMContentLoaded',function(){
			elem_veil = document.createElement('DIV');
			elem_veil.classList.add('random-veil');
			elem_veil.innerHTML = '<img src="http://streamcloud.eu/images_2/logo2.jpg">';
			elem_veil.style.position   = 'fixed';
			elem_veil.style.background = '#f4f4f4';
			elem_veil.style.top       = '0';
			elem_veil.style.left      = '0';
			elem_veil.style.width     = '100%';
			elem_veil.style.height    = '100%';
			elem_veil.style.textAlign = 'center';
			elem_veil.style.zIndex = '999999999999999999999999999999999999999999999999999999999999999999999999999999999999';

			document.body.appendChild(elem_veil);

			setTimeout(function(){
				return false;
				var old_element = document.querySelector('html > body');
				var new_element = old_element.cloneNode(true);
				old_element.parentNode.replaceChild(new_element, old_element);
			},500);

			var hasVideo = false;
			var hashURL  = false;
			if( (hashURL = window.location.href.match(/streamcloud.eu\/([a-zA-Z0-9]+)(\/[a-zA-Z0-9\.\-_]+\.html|)$/))
			 && (hasVideo = document.body.innerHTML.match(/file: .(http:\/\/[^\.]+.streamcloud.eu:8080[^\'\"]+video.mp4)./)) ){
				var name = document.body.innerHTML.match(/<h1[^>]*>([^<]+)</);
				var candidate = {
					 'hash': hashURL[1]
					,'name': name[1]
					,'video': hasVideo[1]
					,'url': window.location.href
				};

				var elem = document.querySelector('#page .content .padding');
				if( elem ){
					var message = {
						 'command':'candidate.exists'
						,'data':candidate
					};
					chrome.runtime.sendMessage(message,function(resp){
						/* 'resp' debería ser status */
						//if( resp ){alert(resp);}
						/* Ponemos botón de descargar */
						var btn = document.createElement('DIV');
						btn.style.display = 'inline-block';
						btn.style.margin = '0 0 10px 0';
						btn.style.backgroundColor = '#10c5ff';
						btn.style.color = '#ffffff';
						btn.style.padding = '6px 10px';
						btn.style.cursor = 'pointer';
						btn.style.borderRadius = '2px';
						btn.innerHTML = 'Downloading ...';

						elem.insertBefore(btn,elem.firstChild);
						if( resp == 'finished' ){
							btn.innerHTML = 'Save File';
							btn.addEventListener('click',function(){
								btn.innerHTML = 'Saving ...';
								var message = {
									 'command':'download.save'
									,'data':candidate
								};
			
								chrome.runtime.sendMessage(message);
							});
						}
						if( !resp ){
							btn.innerHTML = 'Download with StreamCloud Downloader';
							btn.addEventListener('click',function(){
								btn.innerHTML = 'Downloading ...';
								var message = {
									 'command':'download.add'
									,'data':candidate
								};
			
								chrome.runtime.sendMessage(message);
							});
						}
					});
				}

				var message = {
					 'command':'candidate.add'
					,'data':candidate
				};
				chrome.runtime.sendMessage(message);
				console.log(hasVideo[1]);
			}
		});

		addEventListener('load',function(e){
			var test = false;
			if( (test = document.querySelector('#ImSlider')) ){
				test.style.display = 'none';
			}

			if( (test = document.querySelectorAll('[run]')) ){
				test.forEach(function(v,k){
					v.style.display = 'none';
				});
			}

			if( (elem_veil = document.querySelector('.random-veil')) ){
				elem_veil.parentNode.removeChild(elem_veil);
			}

			if( (form_button = document.querySelector('input[name="imhuman"]')) ){
				/* Autoclickamos el botón cuando se ponga azul */
				var observer = new MutationObserver(function(mutations) {
					mutations.forEach(function(mutation) {
						if( form_button.classList.contains('blue') ){
							setTimeout(function(){
								form_button.click();
							},500);
						}
					});
				});
				var config = { attributes: true };
				observer.observe(form_button, config);
			}

			document.body.addEventListener('click',function(e){
				
			});
		});

		//chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
		//	alert("Message recieved!");
		//});
	}
