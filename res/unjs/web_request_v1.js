/* WebRequest */
/* Request Object {
 *  type - POST/GET
 *  dataType - Returned Data Type
 *  url - the URL (On GET request, URL() will ignore data
 *  data - FormData Object
 *  dataAsJSON - 
 *  autoretry - 
 *  allowFailure - 
 *  
 *  always() - Called before the request is made
 *  success(response) - Called before the request is made. Could return XMLDocument, JSON, string or Error
 *  failure(statusCode, statusText) - On a non-successful request
 *  progress(event) - 
 * }
 */
var WebRequest = {
	system_request: null,
	arrayToQuery: function (obj) {
		var str = [];
		for (var p in obj)
			if (obj.hasOwnProperty(p)) {
				str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
			}
		return str.join('&');
	},
	arrayToFormData: function (obj) {
		var data = new FormData();
		for (var p in obj) {
			if (obj.hasOwnProperty(p)) {
				if (obj[p] instanceof Object) {
					for (var i in obj[p]) {
						data.append(p + '[]', obj[p][i])
					}
				} else {
					data.append(p, obj[p].toString())
				}
			}
		}
		return data;
	},
	cleanupOption: function (request_options) {
		request_options.dataType = request_options.dataType ? request_options.dataType.toLowerCase() : 'json'

		if (request_options.type.toLowerCase() === 'get') {
			if (!(request_options.query instanceof URL) && request_options.data) {
				request_options.query = new URL(request_options.url, window.location.protocol + '//' + window.location.host)
				request_options.query.search += (request_options.query.search.length ? '&' : '?') + this.arrayToQuery(request_options.data);
				request_options.url = request_options.query.pathname + request_options.query.search
			}
		} else {
			if (request_options.data && !(request_options.data instanceof FormData)) {
				request_options.data = this.arrayToFormData(request_options.data)
			}
		}
		return request_options
	},
	makeCallback: function (request_options, action, response) {
		if (typeof request_options[action] === 'function') {
			request_options[action](response)
		}
	},
	_response: function (response) {
		if (response !== null) {
			if (response.errmsg) {
				return new Error(response.errmsg)
			}
			if (response.msg) {
				return response.msg;
			}
			return response;
		}
		return new Error('Connection Data is Empty')
	},
	_retry: function (request_options) {
		var _ = this;
		if (request_options.allowFailure === false || request_options.autoretry === true) {
			setTimeout(function ()
			{
				_.handle(request_options)
			}, 2000)
		}
	},
	_handleViaFetch: function (request_options) {
		this.abortController = new AbortController();
		var _ = this;
		
		var fetch_options = {
			credentials: 'same-origin',
			method: request_options.type,
			signal: this.abortController.signal,
			headers: {
				//	'Accept': 'application/json, application/xml, text/plain, text/html, *.*',
				//	'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
			}
		}

		if (fetch_options.method.toLowerCase() !== 'get') {
			if (fetch_options.dataAsJSON)
				fetch_options.body = JSON.stringify(request_options.data)
			else
				fetch_options.body = request_options.data
		}

		_.makeCallback(request_options, 'always')
		this.system_request = fetch(request_options.url, fetch_options).then(
				function (response) {
					if (response.status === 200) {
						if (request_options.dataType === "json") {
							return response.json()
						} else {
							return response.text()
						}
					} else if (response.status === 201) {
						return 'Record Created'
					} else if (response.status === 304) {
						return 'Not Modified'
					} else if (response.status === 400 || response.status === 409) {
						return response.json()
					} else if (response.status === 404) {
						_.makeCallback(request_options, 'failure', response.status)
					} else if (response.status === 500) {
						_.makeCallback(request_options, 'failure', response.status)
					} else {
						_._retry(request_options);
						console.log(response.status)
					}
				}
		).then(function (message) {
			if (message) {
				if (request_options.dataType === "xml") {
					var parser = new DOMParser();
					var doc = parser.parseFromString(message, "application/xml");
					_.makeCallback(request_options, 'success', _._response(doc))
					_.makeCallback(request_options, 'results', _._response(doc))
					return doc
				} else if (request_options.dataType === "html") {
					var parser = new DOMParser();
					var doc = parser.parseFromString(message, "text/html");
					_.makeCallback(request_options, 'success', _._response(doc))
					_.makeCallback(request_options, 'results', _._response(doc))
					return doc
				} else {
					_.makeCallback(request_options, 'success', _._response(message))
					_.makeCallback(request_options, 'results', _._response(message))
				}
			}
		}).catch(function (error) {
			console.log('There has been a problem with your fetch operation: ' + error.message, error)
			_.makeCallback(request_options, 'failure', 0, error)
			_.makeCallback(request_options, 'results', error)
		});
		return this.system_request
	},
	_handleViaXHR: function (request_options) {
		var _ = this;
		this.system_request = new XMLHttpRequest()

		this.system_request.open(request_options.type, request_options.url, true);
		this.system_request.responseType = request_options.dataType ? (request_options.dataType === 'xml' ? 'document' : request_options.dataType) : 'text'

		this.system_request.onprogress = function(e) {
			if (e.total !== 0) {
				_.makeCallback(request_options, 'progress', e)
			}
		}

		this.system_request.onload = function ()
		{//Call a function when the state changes.
			if (this.status === 200) {
				_.makeCallback(request_options, 'success', _._response(this.response))
				_.makeCallback(request_options, 'results', _._response(this.response))
			} else if (this.status === 404) {
				_.makeCallback(request_options, 'failure', this.status)
				_.makeCallback(request_options, 'results', new Error('File not Found'))
			} else {
				_._retry(request_options)
			}
		}

		this.system_request.onerror = function ()
		{
			_.makeCallback(request_options, 'failure', this.status, '')
			_.makeCallback(request_options, 'results', new Error(this.status))
			_._retry(request_options)
		}
		this.system_request.ontimeout = function (e)
		{
			setTimeout(function ()
			{
				_.handle(request_options)
			}, 2000)
		};
		_.makeCallback(request_options, 'always')
		this.system_request.send(request_options.data ? request_options.data : null);
		return this.system_request
	},
	handle: function (request_options)
	{
		if (typeof AbortController === 'function')
			return this._handleViaFetch(request_options)
		else
			return this._handleViaXHR(request_options)
	},
	make: function (request_options)
	{
		request_options = this.cleanupOption(request_options)
		return this.handle(request_options)
	},
	abort: function ()
	{
		if (typeof AbortController === 'function')
			return this.abortController.abort()
		else
			return this.system_request.abort()
	}
}
