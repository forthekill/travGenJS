var HEXSIZE = 48; // Length of hex side
var SEC_COLS = 32; // Number of hex columns
var SEC_ROWS = 40; // Number of hex rows

// Width from hex point to start of side
var HEXH = Math.abs(Math.sin(30*Math.PI/180) * HEXSIZE);
// Height from center point to flat side
var HEXR = Math.abs(Math.cos(30*Math.PI/180) * HEXSIZE);

// Canvas size
// TODO: Figure out why the canvas seems to big based on this calc
var CANVAS_HEIGHT = (HEXSIZE + (HEXH * 2)) * SEC_ROWS;
var CANVAS_WIDTH = (HEXR * 2) * SEC_COLS;

var worldHexNumbers = true; // If true, draws hex numbers only when a world is present

// Colors
var hexColor = "#AAA"; // Color of Hex Outline
var hexNumColor = "#777" // Color of Hex Number

var zoneAmberColor = "#FD0"; // Amber zone color
var zoneRedColor = "#F00"; // Red zone color
var stpColor = "#FFF"; // Color of Starport Text
var nameColor = "#FFF";
var nameColorCapital = "#F00";

var xboatRouteColor = "#390";
var btn08RouteColor = "#A00";
var btn09RouteColor = "#FF6";
var btn10RouteColor = "#F90";
var btn11RouteColor = "#09F";
var btn12RouteColor = "#939";


// World Colors
var worldColor = "#390";
var worldColorAsteroid = "#333";
var worldColorDesert = "#FC3";
var worldColorExotic = "#F00";
var worldColorIce = "#7BF";
var worldColorWater = "#069";
var worldColorVaccuum = "#FFF";

// Font of all text
var textFont = "Arial" // Generic text font
var nameFont = "Arial"; // Font for world data
var nameSize = (HEXSIZE * 0.25) + "px"; // Font size for world data
var nameStyle = "bold"; // Font style for world data

// Line widths
var hexLineWidth = HEXSIZE / 48;
var tradeLineWidth = HEXSIZE / 6;
var travelZoneLineWidth = HEXSIZE / 14;
var worldRadius = HEXSIZE * 0.18;
var worldMaskRadius = HEXSIZE * 0.28;

/* Sets the size of the hex and reevaluates the appropriate variables */
function resizeHex(size){
	if(size <= 0){ size = 1 }; // size must be a positive value
	if(size > 96){ size = 96 }; // size cannot be greater than 96 or Canvas throws an error
	HEXSIZE = size;

	HEXH = Math.abs(Math.sin(30*Math.PI/180) * HEXSIZE);
	HEXR = Math.abs(Math.cos(30*Math.PI/180) * HEXSIZE);
	CANVAS_HEIGHT = (HEXSIZE + (HEXH * 2)) * SEC_ROWS;
	CANVAS_WIDTH = (HEXR * 2) * SEC_COLS;
	
	hexLineWidth = HEXSIZE / 48;
	tradeLineWidth = HEXSIZE / 6;
	travelZoneLineWidth = HEXSIZE / 14;
	worldRadius = HEXSIZE * 0.18;
	worldMaskRadius = HEXSIZE * 0.28;
	
	nameSize = (HEXSIZE * 0.25) + "px";
}


/* MAIN MAP DRAW FUNCTIONS */

/* Takes a Canvas context and draws all map components */
function drawMap(sector,context){
	drawHexes(context);
	if(worldHexNumbers){
		drawWorldHexNumbers(sector,context);
	}else{
		drawHexNumbers(context);
	}
	drawWorlds(sector,context);
	drawSectorData(sector,context);
	drawRoutes2(sector,context);
}

/* Takes a Canvas context and draws a hex map */
function drawHexes(context){
	for (var c=0; c < SEC_COLS; c++){
		for (var i=0; i < SEC_ROWS; i++){
			var hex = getHex(c,i);
			drawHex(hex,context);
		}
	}
}

/* Takes a Canvas context and draws hex map numbers */
function drawHexNumbers(context){
	for (var c=0; c < SEC_COLS; c++){
		for (var i=0; i < SEC_ROWS; i++){
			var hex = getHex(c,i);
			drawHexNumber(hex,context);
		}
	}
}

/* Takes a sector object and Canvas context and draws hex map numbers only in hexes where worlds exist */
function drawWorldHexNumbers(sector,context){
	var len = sector.worlds.length;
	for(var x=0; x < len; x++){
		var hex = getWorldHex(sector.worlds[x]);
		drawHexNumber(hex,context);
	}
}

/* Takes a sector object and a Canvas context and draws the worlds for a sector */
function drawWorlds(sector,context){
	var len = sector.worlds.length;
	for(var x=0; x < len; x++){
		drawWorld(sector.worlds[x],context);
	}
}

/* Takes a sector object and a Canvas context and draws the world data for a sector */
function drawSectorData(sector,context) {
	var len = sector.worlds.length;
	for(var x=0; x < len; x++){
		drawWorldData(sector.worlds[x],context);
	}
}

/* Draws world name, starport, travel zone, gas giant, and bases for a world */
function drawWorldData(world,context){
	drawName(world,context);
	drawStarport(world,context);
	if(world.zone == 1 || world.zone == 2) { drawTravelZone(world,context); }
	drawGasGiant(world,context);
	drawBases(world,context);
}

/* Takes a sector object and a Canvas context and draws the trade routes for a sector  */
function drawRoutes(sector,context) {
	// Loop through the pairs and drawRoute for each one
	var len = sector.tradeRoutePairs.length;
	if (len > 0){
		for(var x=0; x < len; x++){
			drawRoute(sector.tradeRoutePairs[x].start,sector.tradeRoutePairs[x].end,sector.tradeRoutePairs[x].btn,context);
		}
	}else{
		console.log("There are no trade route pairs. Please run generateTradeRoutePairs(sector).");
	}
}

/* SINGLE DRAW FUNCTIONS */

/* Takes a hex and a Canvas context and draws the hex */
function drawHex(hex,context){
	context.lineWidth = hexLineWidth;
	context.strokeStyle = hexColor;
	context.beginPath();
	context.moveTo(hex.points[0].x,hex.points[0].y);
	context.lineTo(hex.points[1].x,hex.points[1].y);
	context.lineTo(hex.points[2].x,hex.points[2].y);
	context.lineTo(hex.points[3].x,hex.points[3].y);
	context.lineTo(hex.points[4].x,hex.points[4].y);
	context.lineTo(hex.points[5].x,hex.points[5].y);
	context.lineTo(hex.points[0].x,hex.points[0].y)
	context.stroke();
	context.closePath();
}

/* Takes a hex and a Canvas context and draws the hexnumber */
function drawHexNumber(hex,context){
	var hexnum = hexString(hex.col,hex.row);
	context.font = (hex.s * 0.25) + "px " + textFont;
	context.textAlign = "center";
	context.fillStyle = hexNumColor;
	context.fillText(hexnum,hex.centerX,hex.centerY - hex.r + (hex.s * 0.25));
	context.closePath();
}

/* Takes a world object and a Canvas context and draws the world */
function drawWorld(world,context){
	//console.log("In drawWorld, hex " + world.hex);

	var hex = getWorldHex(world);
	
	// Draw mask circle under world to make ends of route line concave	
	context.beginPath();
	context.fillStyle = "#000";
	context.arc(hex.centerX,hex.centerY,worldMaskRadius,0,Math.PI*2,true);
	context.fill();
	context.closePath();
	
	context.beginPath();
	context.fillStyle = worldColor;
	if(world.codes.as) { context.fillStyle = worldColorAsteroid; }
	if(world.codes.de) {
		context.fillStyle = worldColorDesert;
	}
	if(world.codes.ic) { context.fillStyle = worldColorIce; }
	if(world.codes.va && (world.hyd < 1)) { context.fillStyle = worldColorVaccuum; }
	if(world.codes.wa) {
		context.fillStyle = worldColorWater;
	}
	if(world.atm == 10) { context.fillStyle = worldColorExotic; };
	
	context.arc(hex.centerX,hex.centerY,worldRadius,0,Math.PI*2,true);
	context.fill();
	context.closePath();

	// TEMP: Dots for alignment, remove later
	//context.fillStyle = "#F00";
	//context.fillRect(hex.centerX,hex.centerY,1,1);
	//context.fillRect(hex.centerX,hex.centerY - (hex.r * .5),1,1);
}

/* Takes a world object and a Canvas context and draws the world name */
function drawName(world,context){

	var hex = getWorldHex(world);
	var wName = world.name;
	
	// Over 1 Billion is CAPS
	if(world.pop > 8){ wName = wName.toUpperCase(); }
	
	context.font = nameStyle + " " + nameSize + " " + nameFont;
	context.textAlign = "center";
	context.fillStyle = nameColor;
	// TODO: Subsec capitals are colored Cx = Sec Cap
	if(world.codes.cp || world.codes.cx) { context.fillStyle = nameColorCapital; }
	context.fillText(wName,hex.centerX,hex.centerY + hex.r - (hex.s * 0.1));
}

/* Takes a world object and a Canvas context and draws starport indicator */
function drawStarport(world,context){

	var hex = getWorldHex(world);

	// Starport Letter
	context.font = "bold " + (hex.s * 0.3) + "px " + textFont;
	context.textAlign = "center";
	context.fillStyle = stpColor;
	context.fillText(world.stp,hex.centerX,hex.centerY - (hex.r * 0.3));
}

/* Takes a world object and a Canvas context and draws a travel zone indicator if any */
function drawTravelZone(world,context){
	
	var hex = getWorldHex(world);
	
	if(world.zone == 1){ context.strokeStyle = zoneAmberColor; } // AMBER
	else if(world.zone == 2){ context.strokeStyle = zoneRedColor; } // RED
	else { return; }
	context.beginPath();
	context.lineWidth = travelZoneLineWidth;
	context.lineCap = "round";
	context.arc(hex.centerX,hex.centerY,(HEXSIZE / 3) * 2,0.75 * Math.PI,0.25 * Math.PI,false);
	context.stroke();
	context.closePath();
}

/* Takes a world object and a Canvas context and draws gas giant indicator if any */
function drawGasGiant(world,context){
	
	var hex = getWorldHex(world);
	
	context.beginPath();
	context.fillStyle = stpColor;
	context.arc(hex.centerX + (hex.s * 0.5),hex.centerY - (hex.r * 0.33),(hex.s / 15),0,Math.PI*2,true);
	context.fill();
	context.closePath();
}

/* Takes a world object and a Canvas context and draws base indicators if any */
function drawBases(world,context){
	
	var hex = getWorldHex(world);
	
	// Base Indicators - Naval: Star, Scout: Triangle, Military: Diamond?
	if(world.base == "N" || world.base == "A"){ drawStar(context,hex); }
	if(world.base == "S" || world.base == "A"){ drawTriangle(context,hex); }
	if(world.base == "M"){ drawSquare(context,hex); }
}


/* UTILITY DRAW FUNCTIONS */

/* Takes a world object and returns a hex object for that world */
function getWorldHex(world){
	// Split hex string into x and y and get zero based column and row
	var col = parseInt(world.hex.substr(0,2),10) - 1;
	var row = parseInt(world.hex.substr(2,2),10) - 1;
	
	return getHex(col,row);
}

/* Takes a hex column and row and returns a hex object with coordinate information for drawing */
function getHex(col,row){
	var hex = {points: []};
	var p0 = {}, p1 = {}, p2 = {}, p3 = {}, p4 = {}, p5 = {};
	
	hex.col = col + 1;
	hex.row = row + 1;
	
	// Hex size calculations (flat side horizontal)
	hex.s = HEXSIZE; // Length of side
	// Width from hex point to start of side
	hex.h = Math.abs(Math.sin(30*Math.PI/180) * hex.s);
	// Height from center point to flat side
	hex.r = Math.abs(Math.cos(30*Math.PI/180) * hex.s);
	hex.b = hex.s + (2*hex.h); // Width (point to point)
	hex.p = hex.b * 0.5; // Center to point
	hex.a = 2*hex.r; // Height (side to side)
	
	// Point 0
	p0.x = 0 + (col * (hex.h + hex.s));
	if(col%2){ // if odd else even
		p0.y = (2 * hex.r) + (row * 2 * hex.r);
	}else{
		p0.y = hex.r + (row * 2 * hex.r);
	}
	hex.points.push(p0);
	
	// Point 1
	p1.x = p0.x + hex.h;
	p1.y = p0.y + hex.r;
	hex.points.push(p1);
	
	// Point 2
	p2.x = p1.x + hex.s;
	p2.y = p1.y;
	hex.points.push(p2);

	// Point 3
	p3.x = p2.x + hex.h;
	p3.y = p2.y - hex.r;
	hex.points.push(p3);
	
	// Point 4
	p4.x = p3.x - hex.h;
	p4.y = p3.y - hex.r;
	hex.points.push(p4);
	
	// Point 5
	p5.x = p4.x - hex.s;
	p5.y = p4.y;
	hex.points.push(p5);

	hex.centerX = hex.points[0].x + (hex.b * 0.5);
	hex.centerY = hex.points[0].y;

	return hex;
}

/* Draws a triangle in a hex to indicate a scout base */
function drawTriangle(context,hex){
	
	var side = HEXSIZE / 6.25;	
	var a = Math.sqrt(Math.pow(side,2) - Math.pow(side * 0.5,2));
	var x = hex.centerX - (hex.s * 0.5);
	var y = hex.centerY + (hex.r * 0.33) - (a * 0.5);
	
	context.beginPath();
	context.fillStyle = stpColor;
	context.moveTo(x,y);
	context.lineTo(x+(side * 0.5),y+a);
	context.lineTo(x-(side * 0.5),y+a);
	context.lineTo(x,y);
	
	context.fill();
	context.closePath();
}

/* Draws a star in a hex to indicate a naval base */
function drawStar(context,hex){  
	// Sample star coords: 10,40 40,40 50,10 60,40 90,40 65,60 75,90 50,70 25,90 35,60
	context.beginPath();
	context.fillStyle = stpColor;
	
	var x = hex.centerX - (hex.s * 0.5) - (HEXSIZE/10);
	var y = hex.centerY - (hex.r * 0.33) - Math.sqrt((HEXSIZE/10.666666));

	context.moveTo(x,y);
	context.lineTo(x+(HEXSIZE/13.333333),y);
	context.lineTo(x+(HEXSIZE * 0.1),y-(HEXSIZE/13.333333));
	context.lineTo(x+(HEXSIZE/8),y);
	context.lineTo(x+(HEXSIZE * 0.2),y);
	context.lineTo(x+(HEXSIZE/7.272727),y+(HEXSIZE * 0.05));
	context.lineTo(x+(HEXSIZE/6.153846),y+(HEXSIZE/8));
	context.lineTo(x+(HEXSIZE * 0.1),y+(HEXSIZE/13.333333));
	context.lineTo(x+(HEXSIZE/26.666665),y+(HEXSIZE/8));
	context.lineTo(x+(HEXSIZE/16),y+(HEXSIZE * 0.05));
	context.lineTo(x,y);
	context.fill();
	context.closePath();
}

/* Draws a triangle in a hex to indicate a scout base */
function drawSquare(context,hex){
	
	var side = HEXSIZE / 7;	
	var x = hex.centerX - (hex.s * 0.5) - (side * 0.5);
	var y = hex.centerY - (hex.r * 0.33) - (side * 0.5);
	
	context.beginPath();
	context.fillStyle = stpColor;
	context.moveTo(x,y);
	context.lineTo(x+side,y);
	context.lineTo(x+side,y+side);
	context.lineTo(x,y+side);
	context.lineTo(x,y);
	context.fill();
	context.closePath();
}

/*  */
function drawRoute(start,end,btn,context){
	var sCol = hexCol(start) - 1;
	var sRow = hexRow(start) - 1;
	var eCol = hexCol(end) - 1;
	var eRow = hexRow(end) - 1;
	var startHex = getHex(sCol,sRow);
	var endHex = getHex(eCol,eRow);
	
	context.beginPath();
	context.lineWidth = tradeLineWidth;
	context.strokeStyle = xboatRouteColor;
	if(btn >= 8){ context.strokeStyle = btn08RouteColor; }
	if(btn >= 9){ context.strokeStyle = btn09RouteColor; }
	if(btn >= 10){ context.strokeStyle = btn10RouteColor; }
	if(btn >= 11){ context.strokeStyle = btn11RouteColor; }
	if(btn >= 12){ context.strokeStyle = btn12RouteColor; }
	
	context.moveTo(startHex.centerX,startHex.centerY);
	context.lineTo(endHex.centerX,endHex.centerY);

	context.stroke();
	context.closePath();
}