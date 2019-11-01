"use strict";
// Actions
window.uAction1811 = {
	lang: {0: "en"},
	eventRegex: /(\w+)(?:@(\w+)(?:;(?:'([\w\s:#{}\.]*)'|(\d]+)|(\{.+\})))?)?/,
	eventsRegex: /(?:\w+(?:@\w+(?:;(?:'[\w\s:#\.]*'|[\w]+)(,('[\w\s:#{}\.]*'|\d+))*)?)?)/g,
	add: function(element, details) {
		if (window["cmd" + details.cmd]) {
			var f = window["cmd" + details.cmd]
			var fq = function(e) {  f.call(element, e, details.args) };
			if (details.event === "now" || details.event === null) {
				fq()
			} else if (details.event === "delay") {
				document.addEventListener("delayload", fq, false)
			} else if (details.event === "globalkey") {
				document.addEventListener("keydown", fq, false)
			} else if (details.event === "minute") {
				element.unwfIntervalId = setInterval(fq, 600000, element)
			} else {
				element.addEventListener(details.event, fq, false)
			}
		} else {
			console.warn(details.cmd, "doesn't not exist", element)
		}
	},
	remove: function(element, details) {
		if (window["cmd" + details.cmd]) {
			//TODO: This is incorrect. Need to fix
			var f = window["cmd" + details.cmd]
			if (details.event === "now" || details.event === null) {
				
			} else if (details.event === "delay") {
				document.removeEventListener("delayload", f, false)
			} else if (details.event === "globalkey") {
				document.removeEventListener("keydown", f, false)
			} else if (details.event === "minute") {
				clearInterval(element.unwfIntervalId)
				delete element.unwfIntervalId
			} else {
				element.removeEventListener(details.event, f, false)
			}
		}
	},
	apply: function(element) {
		if (element instanceof HTMLElement) {
			var event = element.dataset.uEvent
			if (event) {
				var events = event.match(uAction1811.eventsRegex)
				if ( events.length ) {
					events.forEach(function(q) {
						var evargs = uAction1811.eventRegex.exec(q)
						if ( evargs ) {
							uAction1811.add(element, { 'cmd': evargs[1], 'event': evargs[2] || 'now', 'args': evargs[3] || null })
						} else {
							console.warn('invalid event options', q);
						}
					})
				} else {
					console.warn('invalid event options', events[q]);
				}
			}
		} else {
			console.warn(element, 'not an HTMLElement')
		}
	},
	clear: function(element) {
		if (element instanceof HTMLElement) {
			var event = element.dataset.uEvent
			if (event) {
				var events = event.match(uAction1811.eventsRegex)
				if ( events.length ) {
					events.forEach(function(q) {
						var evargs = uAction1811.eventRegex.exec(q)
						if ( evargs ) {
							uAction1811.remove(element, { 'cmd': evargs[1], 'event': evargs[2] || 'now' })
						} else {
							console.warn('invalid event options', q);
						}
					})
				} else {
					console.warn('invalid event options', events[q]);
				}
			}
		}
	},
	trigger: function(element, event) {
		if (element)
			element.dispatchEvent(new Event(event))
	}
};

// Core
window.uCore1811 = {
	initTriggered: false,
	initEvents:[],
	addInitEvent: function(sel, func) {
		if ( this.initTriggered )
			document.querySelectorAll(sel).forEach(func)
		this.initEvents.push({ s: sel, f: func })
	},
	externalScript: function(element) {
		element.addEventListener('load', function() {this.executeText()}, false)
	},
	buttonDelay: function(element) {
		
	},
	dialogPolyfill: function(element) {
		element._form_data = element.querySelector('form[method=dialog]');
		if (element._form_data) {
			element._form_data.addEventListener('submit', function(/*Event*/e) {
				e.preventDefault()
				if ( this.value == undefined ) {
					if ( element._form_data.elements.length == 2 ) {
						this.value = element._form_data.elements[0].value
					} else if ( element._form_data.elements.length > 2 ) {
						console.log('Todo: Return Form Array')
					}
				}
				element.close(this.value);
			})
		}
		element.show = function() {
			element.setAttribute('open','')
		}
		element.close = function(returnValue) {
			element.returnValue = returnValue
			element.dispatchEvent(new Event('close'))
			element.removeAttribute('open')
		}
	},

	dialogForm: function(/*Event*/e) {
		e.preventDefault()
	}
};


(function() {
	function DocumentReady() {
		uCore1811.initEvents.forEach( function(item) { document.querySelectorAll(item.s).forEach(item.f) });
		
		console.timeEnd('script')
		uAction1811.trigger(document, 'delayload')
	}

	uCore1811.addInitEvent('script[src]', uCore1811.externalScript )
	uCore1811.addInitEvent('[data-u-event]', uAction1811.apply )

	if ( typeof(HTMLDialogElement) === "undefined" ) { 
		console.info('No Dialog Support');
		uCore1811.addInitEvent('dialog', uCore1811.dialogPolyfill )
	}

	/* Set this unwf as default unwf */
	if ( !('unwfAction' in window) ) { window['unwfAction'] = window.uAction1811; }
	if ( !('unwfCore' in window) ) { window['unwfCore'] = window.uCore1811; }

	if (document.readyState !== 'loading') { DocumentReady(); } else { document.addEventListener('DOMContentLoaded', DocumentReady);} 
})()