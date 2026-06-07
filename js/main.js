document.addEventListener('DOMContentLoaded', function() {
  var blogButtons = document.querySelectorAll('a.blog-button');
  blogButtons.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      if (location.hash && location.hash === '#blog') return;
      var panel = document.querySelector('.panel-cover');
      if (panel.classList.contains('panel-cover--collapsed')) return;
      document.querySelector('.main-post-list').classList.remove('hidden');
      var currentWidth = panel.offsetWidth;
      if (currentWidth < 2000) {
        panel.classList.add('panel-cover--collapsed');
      } else {
        panel.style.maxWidth = currentWidth + 'px';
        panel.style.width = '22%';
        var start = currentWidth;
        var end = 320;
        var duration = 400;
        var startTime = null;
        function animate(timestamp) {
          if (!startTime) startTime = timestamp;
          var progress = Math.min((timestamp - startTime) / duration, 1);
          var eased = 0.5 - Math.cos(progress * Math.PI) / 2;
          panel.style.maxWidth = (start + (end - start) * eased) + 'px';
          if (progress < 1) requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
      }
    });
  });

  if (window.location.hash && window.location.hash === '#blog') {
    document.querySelector('.panel-cover').classList.add('panel-cover--collapsed');
    document.querySelector('.main-post-list').classList.remove('hidden');
  }

  if (window.location.pathname.substring(0, 5) === '/tag/') {
    document.querySelector('.panel-cover').classList.add('panel-cover--collapsed');
  }
});
