/* Astrometric Constants */
Astrometrics = {
	ParsecScaleX: Math.cos(Math.PI / 6), // cos(30)
	ParsecScaleY: 1.0,
	SectorWidth: 32,
	SectorHeight: 40,
	ReferenceHexX: 1, // Reference is at Core 0140
	ReferenceHexY: 40,
	MinScale: 0.0078125,
	MaxScale: 512
};

<!-- Generates a random number from a set of dice, then adds a modifier // -->
function roll(die,num,mod){
		var result = 0;
	    var	count = 1;
		while(count <= num){
			result = result + (Math.floor(Math.random() * die) + 1);
			count++;
		}
		result = result + mod;
		return result;
}

<!-- Rerolls any result that matches a specified number // -->
function reroll(die,num,mod,non){
	var result = roll(die,num,mod);
	if (result == non){
		result = reroll(die,num,mod,non);
	}
	return result;
}

<!-- Generates a random number from 1 to 6 // -->
function roll1D() {
	return roll(6,1,0);
}

<!-- Generates a random number from 2 to 12 // -->
function roll2D() {
	return roll(6,2,0);
}

<!-- Converts a number from 0 to 35 to its base 36 character // -->
function numToHex(n) {
	return "0123456789ABCDEFGHJKLMNOPQRSTUVWXYZ".charAt(n);
}

<!-- Converts a base 36 character to a number // -->
function hexToNum(n) {
	return "0123456789ABCDEFGHJKLMNOPQRSTUVWXYZ".indexOf(n.toUpperCase());
}

<!-- Convert x,y locations to 4 digit hex string -->
function hexString(x,y){
	var str = rjust(x.toString(),2,"0");
	str += rjust(y.toString(),2,"0");
	return str;
}

/* Gets 2 digit column number from hex location string */
function hexCol(hexnum){
	return hexnum.substr(0,2);
}

/* Gets 2 digit row number from hex location string */
function hexRow(hexnum){
	return hexnum.substr(2,2);
}

<!-- Adds fill to the right of a string to fit a specific size // -->
function ljust(str, size, fill) {
	while (str.length < size) {
		str = str + fill;
	}
	return str;
}

<!-- Adds fill to the left of a string to fit a specific size // -->
function rjust(str, size, fill) {
	while (str.length < size) {
		str = fill + str;
	}
	return str;
}

/* Returns the index of an object in a given array

	var index = arrayIndexOf(array, function(obj) {
		return obj.property == value;
	});
*/
function arrayIndexOf(array, func) {
	if (!func || typeof (func) != 'function'){ return -1; }
	if (!array || !array.length || array.length < 1) { return -1; }
	for (var i = 0; i < array.length; i++){
		if (func(array[i])) { return i; }
	}
	return -1;
}

// Miscellaneous functions
function even(x) { return ( x % 2 ) == 0; }
function odd (x) { return ( x % 2 ) != 0; }
function div(a, b) { return Math.floor(a / b); }
function mod(a, b) { return Math.floor(a % b); }
function max(a, b, c) { return (a >= b && a >= c) ? a : (b >= a && b >= c) ? b : c; }

// Gets the length of an object
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

<!-- Pseudorandom number generator from _Numerical Recipes_ -->
function rand(){
	rand.seed = (rand.seed * rand.a + rand.c) % rand.m;
	return rand.seed / rand.m;
}

rand.m = 714025;
rand.a = 4096;
rand.c = 150889;
rand.seed = (new Date()).getTime() % rand.m;

function srand(seed) { rand.seed = seed; }

/*
/* Distance functions for hexes
*/

/* Returns the distance between two hexes */
function dist(a, b){
	var a_x = div(a,100);
	var a_y = mod(a,100);
	var b_x = div(b,100);
	var b_y = mod(b,100);
	var dx = b_x - a_x;
	var dy = b_y - a_y;
	var adx = Math.abs(dx);
	var ody = dy + div( adx, 2 );
	if( odd(a_x) && even(b_x) ) { ody += 1; }
	return max(adx - ody, ody, adx);
}

/* Returns the distance between two hexes */
function distance(world1, world2){
	var a1 = world1.row + Math.floor(world1.col / 2, 10);
	var a2 = world2.row + Math.floor(world2.col / 2, 10);

	var d1 = Math.abs(a1 - a2);
	var d2 = Math.abs(world1.col - world2.col);
	var d3 = Math.abs((a1 - world1.col) - (a2 - world2.col));

	if ((d1 > d2) && (d1 > d3)){ return d1; }
	if ((d2 > d1) && (d2 > d3)){ return d2; }
	return d3;
}

/* Returns list of hexes within specified jump range */
function reachableHexes(hex, jump){

	var results = [];
	var x = div(hex, 100);
	var y = mod(hex, 100);

	for(var rx = x - jump; rx <= x + jump; rx++){
		for(var ry = y - jump; ry <= y + jump; ry++){
			if(rx >= 1 && rx <= SEC_COLS && ry >= 1 && ry <= SEC_ROWS){
				var candidate = hexString(rx, ry);
				var distance = dist( hex, candidate);
				if(distance > 0 && distance <= jump){
					results.push(candidate);
				}
			}
		}
	}
	return results;
}

//
// These functions are used for helping to determine trade routes
//

// A* Algorithm
// Based on notes in _AI for Game Developers_, Bourg & Seemann, O'Reilly Media, Inc., July 2004.
// Code by Joshua Bell
function Node(id, cost, steps, parent){
	this.id = id;
	this.cost = cost;
	this.steps = steps;
	this.parent = parent;
}

<!-- List function and prototypes -->
function List(){
	this.list = new Object();
	this.count = 0;
}

List.prototype.isEmpty = function(){
	return (this.count == 0);
}

List.prototype.contains = function(node){
	return (this.list[node.id] !== undefined);
}

List.prototype.add = function(node){
	if(!this.contains(node)){
		this.list[node.id] = node;
		this.count++;
	}
	var str = "";
	for(var key in this.list) { str += " " + key + ": " + this.list[key] + "   "; }
}

List.prototype.remove = function(node){
	if(this.contains(node)){
		delete this.list[node.id];
		this.count--;
	}
	var str = "";
	for(var key in this.list) { str += " " + key + ": " + this.list[key] + "   "; }
}

List.prototype.getLowestCostNode = function(){
	var cost = undefined;
	var node = undefined;

	for(var key in this.list){
		var currentNode = this.list[key];
		if(cost === undefined || currentNode.cost < cost){
			node = currentNode;
			cost = currentNode.cost;
		}
	}
	return node;
}
