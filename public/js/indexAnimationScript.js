$(document).ready(function spin() {
  var roc = $("#rocket");
  roc.animate({ top: "ˇ+=10px", left: "+=50px" }, "slow");
});

setInterval(function() {
  $(".h1")
    .fadeOut(2000)
    .delay(500)
    .fadeIn(1500);
  $(".h2").fadeOut(1900);
  $(".h3")
    .fadeOut(1800)
    .delay(500)
    .fadeIn(1500);
}, 10000);

/* Smooth Scroll */

$(function() {
  $("a.menuButton").on("click", function(e) {
    var href = $(this).attr("href");
    var speed = 1000;

    $("html, body")
      .stop()
      .animate({ scrollTop: $(href).offset().top }, speed);

    e.preventDefault();
  });
});

$(function() {
  $(".h1")
    .fadeOut(2000)
    .delay(500)
    .fadeIn(1500);
  $(".h2").fadeOut(1900);
  $(".h3").fadeOut(1800);
  $(".h2").fadeIn(3000);
  $(".h1").fadeOut(2000);
  $(".h3")
    .fadeIn(5000)
    .delay(700)
    .fadeOut(2000);
  $(".h1").fadeIn(2000);
  $(".h3").fadeIn(5000);
});
