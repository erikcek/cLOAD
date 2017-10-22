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





