$(document).ready(function () {
  setTimeout(function () {
    $(".preloading").fadeOut(500, function () {
      // 기록을 남기지 않고 이동
      window.location.replace("/main.html");
    });
  }, 3500);
});
