// Constants for sector size
var SEC_COLS = 32;
var SEC_ROWS = 40;
// Constant for jump distance
var JUMP_DIST = 2;

/**
 * Sector object constructor
 * @param {string} name of the Sector
 */
function Sector(name){
	this.metadata = {};
	this.worlds = [];
	this.secMap = {};
	this.subsectors = [];
	this.tradeRoutes = []; // TODO: change this to generic routes? i think so

	this.metadata.name = name;
	this.metadata.density = 0;
	this.metadata.maturity = 3;

	this.generate = function(density,maturity){
		var name = "Unnamed"; // TODO: Name generator
		this.metadata.density = density;
		this.metadata.maturity = maturity;
		for (var x=1; x <= SEC_COLS; ++x) {
			for (var y=1; y <= SEC_ROWS; ++y) {
				// Determine if world should be generated
				if (roll(100,1,0) > this.metadata.density) {
					continue;
				}
				var system = new World(x,y,name,this.metadata.maturity);
				system.generate();
				this.worlds.push(system);
			}
		}

		// Partition worlds into subsectors
		this.createSubsectors();
		this.splitSector();
		this.createMap();
	}

	/* Converts a sector file (text) into a sector object */
	this.parseSector =  function(text){

		this.createSubsectors();
		/*
				for (var i = 0; i < 16; i += 1) {
					// Creates 16 subsectors each with its own world array
					this.subsectors[i] = {worlds: []};
				}
		*/
		var lineArr = [];
		var count = 0;

		text.split(/\r?\n/).forEach(function(line) {
			lineArr[count] = line;
			count++;
		});

		var len = lineArr.length;

		for(var x=0; x < len; x++){
			var ss;

			if (lineArr[x].match(/^(.{10,}) (\d\d\d\d) (\w\w\w\w\w\w\w-\w) (\w| ) (.{10,}) +(\w| ) (\w\w\w) (\w\w)/)) {
				// Matches data lines for systems
				var w = new World(0,0,"Unnamed",3);
				var u = new UWP();

				w.name = RegExp.$1;
				w.x = hexCol(RegExp.$2);
				w.y = hexRow(RegExp.$2);
				w.hex = RegExp.$2;
				u.parseUWP(RegExp.$3);
				w.uwp = u;
				w.base = RegExp.$4;
				w.trade.parseTradeCodes(RegExp.$5);
				if(RegExp.$6 == "A") { w.zone = 1; }
				if(RegExp.$6 == "R") { w.zone = 2; }
				w.pmod = hexToNum(RegExp.$7.charAt(0));
				w.belt = hexToNum(RegExp.$7.charAt(1));
				w.gas = hexToNum(RegExp.$7.charAt(2));
				w.alg = RegExp.$8;

				w.name = w.name.trim();

				// Calculate WTN per GURPS Far Trader rules
				w.genUWTN();
				w.genWTN();
				w.population = Math.pow(10, w.uwp.pop) * w.pmod;

				this.worlds.push(w);
			}else if (lineArr[x].match(/^#\s+Subsector\s+([A-P]):\s+(.*)/i)) {
				// Match comments for Subsector names, eg. # Subsector A: Orion
				ss = RegExp.$1.charCodeAt(0) - "A".charCodeAt(0);
				ss = this.subsectors[ss];
				ss.name = RegExp.$2;
				ss.index = RegExp.$1;
				ss.name = ss.name.trim();
			}else if (lineArr[x].match(/^#\s+Name:\s+(.*?)( \(.*\))?$/i)) {
				// Match comments for sector names, eg. # Name: Orion (vi)
				this.metadata.name = this.metadata.name || RegExp.$1.trim();
			}else if (lineArr[x].match(/^#\s+Alleg:\s+(.*?)( \(.*\))?$/i)) {
				// TODO: Create an allegiance object for the sector??
				//console.log("Alleg 1: " + RegExp.$1);
				//console.log("Alleg 2: " + RegExp.$2);
			}else if (lineArr[x].match(/^#\s+(.*):\s+(.*)/i)) {
				// More generically matches comments for sec name, author, source, ref, subsec, and allegiance
				this.metadata[RegExp.$1.toLowerCase()] = RegExp.$2.trim();
			}
		}

		this.splitSector();
		this.createMap();
	}

	/* Converts a sector object into text (in .sec file format) */
	this.writeSector = function(){
		var array = [];
		// Grab each world, create a world string, and add it to the array
		this.worlds.forEach(function(world) {
			array.push(world.writeWorld());
		});
		// Create text, one world string per line
		return array.join("\n");
	}

	this.writeSectorHTML = function(){
		var array = [];
		array.push("<pre>");
		// Grab each world, create a world string, and add it to the array
		this.worlds.forEach(function(world) {
			array.push(world.writeWorld());
		});
		array.push("</pre>");
		// Create text, one world string per line
		return array.join("</br>");
	}

	this.splitSector = function(){
		var wlen = this.worlds.length;
		// Partition worlds into subsectors
		for(var w=0; w < wlen; w++){
			var ss = this.worlds[w].getSubsec();
			//console.log("ss: " + ss);
			this.subsectors[ss].worlds.push(this.worlds[w]);
		}
	}

	this.createSubsectors = function(){
		for (var i = 0; i < 16; i += 1) {
			// Creates 16 subsectors each with its own world array
			this.subsectors[i] = {worlds: []};
		}
	}

	/* Creates a sectorMap object from a world array */
	// TODO: Make this private, create removeWorld and addWorld methods that will do a map update
	this.createMap = function(){
		for(var x in this.worlds){
			this.secMap[this.worlds[x].hex] = 1;
		}
	}

	/* Generates trade routes for the sector */
	this.generateTradeRoutes = function(){
		// Create routes array containing all route objects
		var type = "trade";
		var len = this.worlds.length;

		for(var i=0; i < len; i++){
			var start = this.worlds[i];
			for(var x=i+1; x < len; x++){
				//console.log(x);
				var end = this.worlds[x];
				var rt = new Route(start.hex,end.hex,type);
				//console.log("rt: " + rt);
				// Calculate best route for jump length
				rt.calculatePath(JUMP_DIST,this.secMap);
				console.log("Path: " + rt.path);
				// If there is no route, go to the next pair
				if (rt.path == undefined){ continue; }
				// If there is a route, calculate the BTN
				rt.genBTN(start,end);
				console.log("BTN: " + rt.btn);
				// If BTN is high enough, add to tradeRoutes object
				if (rt.btn >= MIN_BTN){
					this.tradeRoutes.push(route);
				}
			}
		}
	}

	this.addWorld = function(world){
		// Add to world array
		this.worlds.push(world);
		// Update map object
		this.secMap[world.hex] = 1;
		// Add to subsector array
		var ss = world.getSubsec();
		this.subsectors[ss].addWorld(world);

	}

	this.delWorld = function(hex){
		// TODO: Delete a world
		// Update map object
		// Update subsector and world arrays
	}

};


/**
 * Subsector object constructor
 * @param {string} letter of the Subsector
 */
function Subsector(letter){
	this.name = "";
	this.index = hexToNum(letter);
	this.letter = letter;
	this.worlds = [];

	this.generate = function(){
		// TODO
	}

	this.parseSubsec = function(letter){
		// Takes text and puts it into subsec object
	}

	this.writeSubsec = function(letter){
		// Writes the subsector to text?
	}

	this.addWorld = function(world){

	}
};


/**
 * World object constructor
 * @param {string} x coordinate in the Sector
 * @param {string} y coordinate in the Sector
 * @param {string} name of the World
 * @param {string} maturity of the World
 */
function World(x,y,name,maturity){
	this.name = name;
	this.x = x;
	this.y = y;
	this.hex = rjust(this.x.toString(), 2, "0") + rjust(this.y.toString(), 2, "0");
	this.mat = maturity;
	this.uwp = new UWP();
	this.base = " ";
	this.trade = new TradeCodes();
	this.pmod = 0;
	this.gas = 0;
	this.belt = 0;
	this.zone = 0;
	this.alg = "Un";

	this.uwtn = 0;
	this.wtn = 0;

	// TODO should a world keep track of its subsector and sector? probably.
	// TODO create a setHex method for x and y, remove x and y from constructor
	// TODO generate should take maturity

	this.generate = function(){
		this.genUwp();
		this.genExt();
		this.genTradeNumber();
	}

	this.parseWorld = function(){
		// TODO Takes a world string and parses it into a World object
	}

	/* Concatenates a World object into a world string */
	this.writeWorld = function(){
		var line = ljust(this.name,25," ");
		line += this.hex;
		line += " ";
		line += this.uwp.writeUWP();
		line += this.base + " ";
		line += ljust(this.trade.writeTradeCodes(),15," ");
		line += rjust(" AR".charAt(this.zone),11," ") + " ";
		line += this.pmod;
		line += this.belt;
		line += this.gas + " ";
		line += this.alg;
		return line;
	}

	/* Generates UWP for a world */
	this.genUwp = function(){
		this.uwp.generate(this.mat)
	}

	/* Generates extended stats for a world */
	this.genExt = function(){
		this.genBase(this.uwp);
		this.trade.generate(this.uwp);
		this.genPopMod();
		this.genGasGiant();
		this.genPlanBelt();
		this.genTravelZone(this.uwp);
		this.genAllegiance();
	}

	/* Generates a trade number for a world */
	this.genTradeNumber = function(){
		this.genUWTN();
		this.genWTN();
	}

	/* Generates what bases, if any, for a world */
	this.genBase = function(uwp){
		var nav,sct,mil = 0;

		if (uwp.stp == 10){ // A
			if (roll(6,2,0) > 7) { nav = 1; }
			if (roll(6,2,0) > 9) { sct = 1; }
			if (roll(6,2,0) > 9) { mil = 1; }
		}

		if (uwp.stp == 11){ // B
			if (roll(6,2,0) > 7) { nav = 1; }
			if (roll(6,2,0) > 8) { sct = 1; }
			if (roll(6,2,0) > 8) { mil = 1; }
		}

		if (uwp.stp == 12){ // C
			if (roll(6,2,0) > 7) { sct = 1; }
			if (roll(6,2,0) > 7) { mil = 1; }
		}

		if (uwp.stp == 13){ // D
			if (roll(6,2,0) > 6) { sct = 1; }
		}

		if (nav && !sct) { this.base = "N"; }
		if (!nav && sct) { this.base = "S"; }
		if (nav && sct) { this.base = "A"; }
		if (!nav && !sct && mil) { this.base = "M"; }
	}

	/* Generates population multiplier for the mainworld */
	this.genPopMod = function(){
		if (roll(6,1,0) % 2){
			this.pmod = reroll(6,1,-1,5);
		}else{
			this.pmod = reroll(6,1,4,10);
		}
	}

	/* Generates gas giants for a system */
	this.genGasGiant = function(){
		if (roll(6,2,0) > 4){
			var res = roll2D();
			if (res < 10){
				this.gas = Math.floor(res / 2);
			}else{
				this.gas = Math.ceil(res / 2 - 1);
			}
		}else{ this.gas = 0; }
	}

	/* Generates planetoid belts for a system */
	this.genPlanBelt = function(){
		var res = roll(6,2,this.gas);
		if (res < 8){ plb = 1 }
		if (res == 12){
			this.belt = 3;
		}else{
			this.belt = 2;
		}
	}

	/* Generates the Travel Zone designation, if any, for a world */
	this.genTravelZone = function(uwp){
		if (uwp.stp == 33) { this.zone = 2; }
		if (uwp.gov == 10 && uwp.law == 20) { this.zone = 1; }
		if (uwp.gov == 11 && uwp.law > 18) { this.zone = 1; }
		if (uwp.gov == 12 && uwp.law > 17) { this.zone = 1; }
		if (uwp.gov == 13 && uwp.law > 16) { this.zone = 1; }
		if (uwp.gov == 13 && uwp.law == 20) { this.zone = 2; }
		if (uwp.gov == 14 && uwp.law > 16 && uwp.law < 19) { this.zone = 1; }
		if (uwp.gov == 14 && uwp.law > 18) { this.zone = 2; }
		if (uwp.gov == 15 && uwp.law > 15) { this.zone = 1; }
		if (uwp.gov == 15 && uwp.law > 17) { this.zone = 2; }
	}

	/* Generates the Allegiance for a world */
	this.genAllegiance = function(){
		// TODO: Allegiance list config
		this.alg = "Rg";
	}

	/* Generates UWTN for a world */
	this.genUWTN = function(){

		var tlConvert = [13,12,11,10,10,9,9,9,8,7,6,6,5,5,5,4,3]; // GURPS to Traveller TL conversion array
		// 1. Determine Unmodified World Trade Number (UWTN)

		// TL Modifier
		var tl = tlConvert[this.uwp.tl];
		var tlMod = 1.5;
		if (tl < 12) { tlMod -= .5; }
		if (tl < 9) { tlMod -= .5; }
		if (tl < 6) { tlMod -= .5; }
		if (tl < 3) { tlMod -= .5; }

		// Determine Population Modifier
		var popMod = this.uwp.pop / 2;

		this.uwtn = popMod + tlMod;
	}

	/* Generates WTN for a world */
	this.genWTN = function(){

		// 2. Determine Port Modifier
		// Set up arrays of modifiers for the "chart", one list per Starport Class
		var pmA = [1.5,1,1,.5,.5,0,0,0];
		var pmB = [1,1,.5,.5,0,0,-.5,-1];
		var pmC = [1,.5,.5,0,0,-.5,-1,-1.5];
		var pmD = [.5,.5,0,0,-0.5,-1,-1.5,-2];
		var pmE = [.5,0,0,-.5,-1,-1.5,-2,-2.5];
		var pmX = [0,0,-2.5,-3,-3.5,-4,-4.5,-5];

		// Add each Starport Class modifier list to the master array to create the "chart", at its base_36 location
		var pmArr = [];
		pmArr[10] = pmA;
		pmArr[11] = pmB;
		pmArr[12] = pmC;
		pmArr[13] = pmD;
		pmArr[14] = pmE;
		pmArr[33] = pmX;

		// Round UWTN down to use in lookup of Port Modifier
		var ruwtn = Math.floor(this.uwtn);
		if (ruwtn > 7) { ruwtn = 7; }
		if (ruwtn < 1) { ruwtn = 0; }

		// Use UWTN and converted Starport number to lookup the Port Modifier from the "chart"
		var portMod = pmArr[this.uwp.stp][ruwtn];

		// 3. Determine World Trade Number
		this.wtn = this.uwtn + portMod;
	}

	this.getSubsec = function(){
		var	ss = Math.floor((this.x - 1) / (SEC_COLS / 4)) + Math.floor((this.y - 1) / (SEC_ROWS / 4)) * 4;
		return ss;
	}
};


/**
 * UWP object constructor
 */
function UWP(){
	this.stp = 35;
	this.size = 0;
	this.atm = 0;
	this.hyd = 0;
	this.pop = 0;
	this.gov = 0;
	this.law = 0;
	this.tl = 0;

	/* Generates the entire UWP */
	this.generate = function(maturity){
		console.log("Generate");
		this.genStarport(maturity);
		this.genSize();
		this.genAtmo(this.size);
		this.genHydro(this.size,this.atm);
		this.genPop();
		this.genGov(this.pop);
		this.genLaw(this.gov);
		this.genTL(this.stp,this.size,this.atm,this.hyd,this.pop,this.gov);
	}

	this.parseUWP = function(text){
		this.stp = hexToNum(text.charAt(0));
		this.siz = hexToNum(text.charAt(1));
		this.atm = hexToNum(text.charAt(2));
		this.hyd = hexToNum(text.charAt(3));
		this.pop = hexToNum(text.charAt(4));
		this.gov = hexToNum(text.charAt(5));
		this.law = hexToNum(text.charAt(6));
		this.tl = hexToNum(text.charAt(8));
	}

	this.writeUWP = function(){
		var upp = this.stp;
		upp += numToHex(this.siz);
		upp += numToHex(this.atm);
		upp += numToHex(this.hyd);
		upp += numToHex(this.pop);
		upp += numToHex(this.gov);
		upp += numToHex(this.law);
		upp += "-";
		upp += numToHex(this.tl);
		upp += " ";
		return upp;
	}

	/* Generates the Starport */
	this.genStarport = function(maturity){
		// Starport quality
		var stp = "X";
		switch(maturity){
			case 1: // backwater
				stp = "NAABBCCCDEEX".charAt(roll(6,2,-1));
				break;
			case 2: // frontier
				stp = "NAAABBCCDEEX".charAt(roll(6,2,-1));
				break;
			case 4: //cluster
				stp = "NAAAABBCCDEX".charAt(roll(6,2,-1));
				break;
			default: // mature
				stp = "NAAABBCCDEEE".charAt(roll(6,2,-1));
				break;
		}
		this.stp = parseInt(stp,36);
	}

	/* Generates the Size of a world */
	this.genSize = function(){
		this.size = roll(6,2,-2);
	}

	/* Generates the Atmosphere type for a world */
	this.genAtmo = function(size){
		this.atm = roll(6,2,-7) + size;
		if (size < 0 || this.atm < 0) { this.atm = 0; }
	}

	/* Generates the Hydrographic percentage for a world */
	this.genHydro = function(size,atmo){
		this.hyd = roll(6,2,-7) + size;
		if (size < 2) { this.hyd = 0; }
		if (atmo < 2 || atmo > 9) { this.hyd -= 4; }
		if (this.hyd < 0) { this.hyd = 0; }
		if (this.hyd > 10) { this.hyd = 10; }
	}

	/* Generates the Population of a world */
	this.genPop = function(){
		this.pop = roll(6,2,-2);
	}

	/* Generates the Government type for a world */
	this.genGov = function(pop){
		this.gov = roll(6,2,-7) + pop;
		if (this.gov < 0) { this.gov = 0; }
	}

	/* Generates the Law Level for a world */
	this.genLaw = function(gov){
		this.law = roll(6,2,-7) + gov;
		if (this.law < 0) { this.law = 0; }
	}

	/* Generates the Tech level for a world */
	this.genTL = function(stp,size,atmo,hydro,pop,gov){
		this.tl = roll(6,1,0);
		if (stp == 10) { this.tl += 6; }
		if (stp == 11) { this.tl += 4; }
		if (stp == 12) { this.tl += 2; }
		//if (stp == 15) { this.tl += 1; } // Errata, but there is no starport F
		if (stp == 33) { this.tl -= 4; }
		if (size < 5) { this.tl += 1; if (size < 2) { this.tl += 1; } }
		if (atmo < 4) { this.tl += 1; }
		if (atmo > 9) { this.tl += 1; }
		if (hydro > 8) { this.tl += 1; if (hydro > 9) { this.tl += 1; } }
		if (pop > 0 && pop < 6) { this.tl += 1; }
		if (pop > 8) { this.tl += 2; if (pop > 9) { this.tl += 2; } }
		if (gov == 0 || gov == 5) { this.tl += 1; }
		if (gov == 13) { this.tl -= 2; }
		if (gov > 13) { this.tl -= 1; } // Errata
		if (this.tl < 0) { this.tl = 0; }
	}

};


/**
 * Route object constructor
 * @param {string} start hex of the Route
 * @param {string} end hex of the Route
 * @param {string} type of Route (trade, xboat, gate, wormhole, etc.)
 */
function Route(start,end,type){
	this.type = type; // trade, xboat, gate, wormhole, etc.
	this.start = start; // start hex
	this.end = end; // end hex
	this.distance = dist(start,end);
	this.path = []; // array of full path of all hexes, in order
	this.btn = 0; // BTN for start-end pair
	this.secx = 0; // x coord of sector, relative to start
	this.secy = 0; // y coord of sector, relative to start

	/* Determines whether there is a route between two world given a specific jump distance and returns the path */
	this.calculatePath = function(jump,map){
		var opened = new List();
		var closed = new List();

		// add the starting node to the open list
		opened.add(new Node(this.start, 0, 0, undefined));
		// while the open list is not empty
		while(!opened.isEmpty()){
			// current node = node from open list with the lowest cost
			var currentNode = opened.getLowestCostNode();
			//alert(currentNode);
			// if current node = goal node then path complete
			if(currentNode.id == this.end){
				var path = [];
				var node = currentNode;
				path.unshift(node.id);
				while(node.parent){
					node = node.parent;
					path.unshift(node.id);
				}
				this.path = path;
			}else{
				// Move current node to the closed list
				opened.remove(currentNode);
				closed.add(currentNode);
				// Examine each node adjacent to the current node
				var adjacentHexes = reachableHexes(currentNode.id, jump);
				// For each adjacent node
				var length = adjacentHexes.length;
				for(var i = 0; i < length; i++){
					var adjacentHex = adjacentHexes[i];
					var adjacentNode = new Node(adjacentHex, -1, currentNode.steps+1, currentNode);
					// if it isn't on the open list
					if(!opened.contains(adjacentNode)){
						// and it isn't on the closed list
						if(!closed.contains(adjacentNode)){
							// and it isn't an obstacle then
							if(map[adjacentHex] !== undefined){
								// move it to open list and calculate cost
								opened.add(adjacentNode);
								var cost = adjacentNode.steps + dist(adjacentHex, this.end);
								// NOTE: Can tweak cost, e.g.
								// 	if RedZone then cost += 2, if AmberZone then cost += 1
								// 	if NoWater then cost += 1, if !Imperial then cost += 1
								adjacentNode.cost = cost;
							}
						}
					}
				}
			}
		}
		this.path = undefined;
	}


	/* Generate a BTN for a world pair */
	this.genBTN = function(world1, world2){

		var mods = {};
		var modDist, modWCTM = 0;

		// 1. Determine World Trade Classification Modifier

		mods.wctm = 0;
		// Check to see if one world is Ag and the other is either Ex or Na
		if (world1.codes.ag) {
			if (world2.codes.ex || world2.codes.na){ mods.wctm += .5; }
		}else if (world2.codes.ag){
			if (world1.codes.ex || world1.codes.na) { mods.wctm += .5; }
		}

		// Check to see if one world is In and the other is Ni
		if (world1.codes.in) {
			if (world2.codes.ni) { mods.wctm += .5; }
		}else if (world2.codes.in) {
			if (world1.codes.ni) { mods.wctm += .5; }
		}

		// Check to see if worlds share allegiences
		if (world1.alg != world2.alg) { mods.wctm -= .5; }

		// 2. Determine Distance Modifier
		var parsecs = routeLength(this.path);
		mods.dist = 0;
		if (parsecs > 1) { mods.dist += .5; }
		if (parsecs > 2) { mods.dist += .5; }
		if (parsecs > 5) { mods.dist += .5; }
		if (parsecs > 9) { mods.dist += .5; }
		if (parsecs > 19) { mods.dist += .5; }
		if (parsecs > 29) { mods.dist += .5; }
		if (parsecs > 59) { mods.dist += .5; }
		if (parsecs > 99) { mods.dist += .5; }
		if (parsecs > 199) { mods.dist += .5; }
		if (parsecs > 299) { mods.dist += .5; }
		if (parsecs > 599) { mods.dist += .5; }
		if (parsecs > 999) { mods.dist += .5; }

		// 3. Calculate Bilateral Trade Number (BTN)
		// BTN = WTN1 + WTN2 + WTCM - Distance Modifier
		this.btn = world1.wtn + world2.wtn + mods.wctm - mods.dist;
		if (world1.wtn < world2.wtn){
			if (this.btn > world1.wtn + 5) { this.btn = world1.wtn + 5; }
		}else{
			if (this.btn > world2.wtn + 5) { this.btn = world2.wtn + 5; }
		}
	}


	/* Returns the length of a route path in parsecs */
	this.length = function(){
		var len = this.path.length;
		var hops = 0;
		for(var x; x < len - 1; x++){
			hops += dist(this.path[x],this.path[x-1]);
		}
		return hops;
	}
};


/**
 * Trade code object constructor
 */
function TradeCodes(){
	this.ag = false;
	this.as = false;
	this.ba = false;
	this.de = false;
	this.fl = false;
	this.hi = false;
	this.ic = false;
	this.ind = false;
	this.lo = false;
	this.na = false;
	this.ni = false;
	this.po = false;
	this.ri = false;
	this.wa = false;
	this.cp = false;
	this.cx = false;

	/* Generates trade codes for a world */
	this.generate = function(uwp){
		if ((uwp.atm > 3 && uwp.atm < 10) && (uwp.hyd > 3 && uwp.hyd < 9) && (uwp.pop > 4 && uwp.pop < 8)){	this.ag = true; }
		if (uwp.size == 0 && uwp.atm == 0 && uwp.hyd == 0){ this.as = true; } else if (uwp.atm == 0){ this.va = true; }
		if (uwp.pop == 0 && uwp.gov == 0 && uwp.law == 0) { this.ba = true; }
		if (uwp.hyd == 0 && uwp.atm > 1) { this.de = true; }
		if (uwp.size > 9 && uwp.atm > 0) { this.fl = true; }
		if (uwp.pop > 8) { this.hi = true; }
		if (uwp.atm < 2 && uwp.hyd > 0) { this.ic = true; }
		if ((uwp.atm < 5 || uwp.atm == 7 || uwp.atm == 9) && uwp.pop > 8) { this.ind = true; }
		if (uwp.pop < 4) { this.lo = true; }
		if (uwp.atm < 4 && uwp.hyd < 4 && uwp.pop > 5) { this.na = true; }
		if (uwp.pop < 7) { this.ni = true; }
		if ((uwp.atm > 1 && uwp.atm < 6) && uwp.hyd < 4) { this.po = true; }
		if ((uwp.atm == 6 || uwp.atm == 8) && (uwp.pop > 5 && uwp.pop < 9) && (uwp.gov > 3 && uwp.gov < 10)){ this.ri = true; }
		if (uwp.hyd == 10) { this.wa = true; }
	}

	/* Parse a string of trade codes and set the world object properties */
	this.parseTradeCodes = function(text){
		var array = text.split(" ");
		var len = array.length;
		for(var x=0; x < len; x++){
			switch(array[x]){
				case "Ag":
					this.ag = true;
					break;
				case "As":
					this.as = true;
					break;
				case "Ba":
					this.ba = true;
					break;
				case "Cp":
					this.cp = true;
					break;
				case "Cx":
					this.cx = true;
					break;
				case "De":
					this.de = true;
					break;
				case "Fl":
					this.fl = true;
					break;
				case "Hi":
					this.hi = true;
					break;
				case "Ic":
					this.ic = true;
					break;
				case "In":
					this.ind = true;
					break;
				case "Lo":
					this.lo = true;
					break;
				case "Na":
					this.na = true;
					break;
				case "Ni":
					this.ni = true;
					break;
				case "Po":
					this.po = true;
					break;
				case "Ri":
					this.ri = true;
					break;
				case "Va":
					this.va = true;
					break;
				case "Wa":
					this.wa = true;
					break;
				case "  ":
					break;
				case " ":
					break;
				case "":
					break;
				default:
					this[array[x].toLowerCase()] = true;
					break;
			}
		}
	}

	/* Create string from world trade code properties */
	this.writeTradeCodes = function(){
		var codes = "";
		if (this.ag){ codes += "Ag "; }
		if (this.as){ codes += "As "; }
		if (this.ba){ codes += "Ba "; }
		if (this.cp){ codes += "Cp "; }
		if (this.cx){ codes += "Cx "; }
		if (this.de){ codes += "De "; }
		if (this.fl){ codes += "Fl "; }
		if (this.hi){ codes += "Hi "; }
		if (this.ic){ codes += "Ic "; }
		if (this.ind){ codes += "In "; }
		if (this.lo){ codes += "Lo "; }
		if (this.na){ codes += "Na "; }
		if (this.ni){ codes += "Ni "; }
		if (this.po){ codes += "Po "; }
		if (this.ri){ codes += "Ri "; }
		if (this.va){ codes += "Va "; }
		if (this.wa){ codes += "Wa"; }
		return codes;
	}
};
