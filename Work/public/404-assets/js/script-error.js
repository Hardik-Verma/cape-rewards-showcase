$(document).ready(function(){
	var c = document.getElementById('c'),
    ctx = c.getContext('2d'),
    height = window.innerHeight,
    width = window.innerWidth,
    stars = [],
    size = 6,
    color = '255,255,255',
    maxStars = 300;

	//Set height and Width canvas
	c.width  = width;
	c.height = height;

	function star() {
	  this.size         = Math.random() * 2;
	  this.x            = Math.random() * 1 * width;
	  this.y            = Math.random() * 1 * height;
	  this.transparency = 0.0;
	  this.speed        = Math.random() / 4;
	  this.direction    = 1;
	}

	star.prototype.update = function() {
	  ctx.fillStyle = 'rgba('+color+','+this.transparency+')';
	  ctx.fillRect(this.x, this.y, this.size, this.size);
	  if (this.transparency >= 1) {
	    this.direction = -1;
	  } else if (this.transparency <= 0) {
	    this.direction = 1;
	  }
	  if (this.direction == 1) {
	    this.transparency += (0.05 * this.speed);
	  } else {
	    this.transparency -= (0.05 * this.speed);
	  }
	  ctx.stroke();
	}

	function draw() {
	  ctx.clearRect(0, 0, width, height);
	  for(var i=0;i<maxStars;i++) {
	    stars[i].update();
	  }
	  window.requestAnimationFrame(draw);
	}

	function init() {
	  for(var i=0;i<maxStars;i++) {
	    var l = new star();
	    stars.push(l);
	  }
	  window.requestAnimationFrame(draw);
	}

	init();
	
});


var tID; //we will use this variable to clear the setInterval()

function animateScript() {
	var    position = 105; //start position for the image slicer
	const  interval = 100; // ms of interval for the setInterval()
	tID = setInterval ( () => {
		document.getElementById("blackhole-img").style.left = `-${position}px`; 
		//we use the ES6 template literal to insert the variable "position"
		if (position < 15750) { position = position + 105;}
		//we increment the position by 105 each time
		else { position = 105; }
		//reset the position to 105px, once position exceeds 15750px
	}, interval ); //end of setInterval
} //end of animateScript()

animateScript();