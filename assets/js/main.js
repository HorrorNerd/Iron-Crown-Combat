(function(){
  // Theme init
  const root = document.documentElement;
  const saved = localStorage.getItem('icc:theme');
  if (saved === 'light') root.classList.add('light');

  // Toggle
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-theme-toggle]');
    if(!t) return;
    root.classList.toggle('light');
    localStorage.setItem('icc:theme', root.classList.contains('light') ? 'light' : 'dark');
  });

  // Mobile drawer
  const drawerBtn = document.querySelector('[data-drawer]');
  const drawer = document.querySelector('#drawer');
  if (drawerBtn && drawer){
    drawerBtn.addEventListener('click', ()=>{
      drawer.hidden = !drawer.hidden;
    });
  }

  // Active nav
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav] a').forEach(a=>{
    const href = a.getAttribute('href');
    if (!href) return;
    if (href === path) a.setAttribute('aria-current','page');
  });
})();
