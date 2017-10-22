/* Stars */
setInterval(
	function(){
		$('.h1').fadeOut(2000).delay(500).fadeIn(1500);		
	},6000
); 
setInterval(
	function(){
		$('.h2').fadeOut(1000).delay(500).fadeIn(1500);		
	},10000
); 
setInterval(
	function(){
		$('.h3').fadeOut(4000).delay(500).fadeIn(4000);		
	},3000
); 

/* Smooth Scroll */

$( function(){
	$('a.menuButton').on('click', function(e){
	  var href = $(this).attr('href');
	  var speed = 1000;

	 $("html, body").stop().animate(
	   { scrollTop: $(href).offset().top },
	   speed );

	  e.preventDefault();
	});
});





