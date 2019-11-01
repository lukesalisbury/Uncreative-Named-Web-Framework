"use strict";
//Compat
if (window.NodeList && !NodeList.prototype.forEach) { NodeList.prototype.forEach = Array.prototype.forEach; }

// UNWF DOM Extension
HTMLCollection.prototype.forEach = Array.prototype.forEach;
HTMLScriptElement.prototype.executeText = function() { if ( this.text.length && this.src ) { new Function(this.text)() } }
HTMLElement.prototype.removeChildren = function() { while (this.firstChild) { this.removeChild(this.firstChild); } };
HTMLDocument.prototype.newElement = function(tag, kid, attr, ev) {
	var q = document.createElement(tag)
	if ( kid instanceof Array ) { kid.forEach(function(item){q.appendNewElement(item.tag, item.children, item.attr, item.ev)}) }
	else if (typeof(kid) === "string" ) { q.textContent = kid }
	for (var prop in attr) { q.setAttribute(prop, attr[prop]); }
	for (var prop in ev) { q.addEventListener(prop, ev[prop]); }
	return q
};
HTMLElement.prototype.appendNewElement = function(tagName, kid, attributes, events) {
	var q = document.newElement(tagName, kid, attributes, events)
	this.appendChild(q)
	return q
};
HTMLSelectElement.prototype.getSelectedElement = function() { if (this.selectedIndex != -1) { return this.children[this.selectedIndex] } return null };