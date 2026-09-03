
(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  onscroll(document, navbarlinksActive)

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let header = select('#header')
    let offset = header.offsetHeight

    if (!header.classList.contains('header-scrolled')) {
      offset -= 16
    }

    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos - offset,
      behavior: 'smooth'
    })
  }

  /**
   * Header fixed top on scroll
   */
  let selectHeader = select('#header')
  if (selectHeader) {
    let headerOffset = selectHeader.offsetTop
    let nextElement = selectHeader.nextElementSibling
    const headerFixed = () => {
      if ((headerOffset - window.scrollY) <= 0) {
        selectHeader.classList.add('fixed-top')
        nextElement.classList.add('scrolled-offset')
      } else {
        selectHeader.classList.remove('fixed-top')
        nextElement.classList.remove('scrolled-offset')
      }
    }
    window.addEventListener('load', headerFixed)
    onscroll(document, headerFixed)
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top')
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active')
      } else {
        backtotop.classList.remove('active')
      }
    }
    window.addEventListener('load', toggleBacktotop)
    onscroll(document, toggleBacktotop)
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    const navbar = select('#navbar')
    const header = select('#header')
    navbar.classList.toggle('navbar-mobile')
    header.classList.toggle('menu-open', navbar.classList.contains('navbar-mobile'))
    if (navbar.classList.contains('navbar-mobile')) {
      header.style.zIndex = '2147483647'
      navbar.style.zIndex = '2147483647'
      navbar.querySelector('ul').style.zIndex = '2147483647'
    } else {
      header.style.zIndex = ''
      navbar.style.zIndex = ''
      navbar.querySelector('ul').style.zIndex = ''
    }
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Mobile nav dropdowns activate
   */
  on('click', '.navbar .dropdown > a', function(e) {
    if (select('#navbar').classList.contains('navbar-mobile')) {
      e.preventDefault()
      this.nextElementSibling.classList.toggle('dropdown-active')
    }
  }, true)

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let navbar = select('#navbar')
      if (navbar.classList.contains('navbar-mobile')) {
        navbar.classList.remove('navbar-mobile')
        select('#header').classList.remove('menu-open')
        select('#header').style.zIndex = ''
        navbar.style.zIndex = ''
        navbar.querySelector('ul').style.zIndex = ''
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Preloader
   */
  let preloader = select('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove()
    });
  }

  /**
   * Initiate glightbox
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Skills animation
   */
  let skilsContent = select('.skills-content');
  if (skilsContent) {
    new Waypoint({
      element: skilsContent,
      offset: '80%',
      handler: function(direction) {
        let progress = select('.progress .progress-bar', true);
        progress.forEach((el) => {
          el.style.width = el.getAttribute('aria-valuenow') + '%'
        });
      }
    })
  }

  /**
   * Testimonials slider
   */
  new Swiper('.testimonials-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });

  /**
   * Porfolio isotope and filter
   */
  window.addEventListener('load', () => {
    let portfolioContainer = select('.portfolio-container');
    if (portfolioContainer) {
      const portfolioItems = select('.portfolio-item', true);
      const portfolioGroups = ['filter-spaces', 'filter-casinos', 'filter-cabins'];
      const portfolioSwipers = [];

      portfolioGroups.forEach((group) => {
        const groupItems = portfolioItems.filter((item) => item.classList.contains(group));
        if (!groupItems.length) return;

        const pack = document.createElement('div');
        pack.className = `portfolio-pack ${group}`;
        pack.dataset.filter = `.${group}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'swiper-wrapper';
        groupItems.forEach((item) => {
          item.classList.add('swiper-slide');
          wrapper.appendChild(item);
        });
        pack.innerHTML = `<div class="portfolio-pack-heading"><span>${group.replace('filter-', '')}</span><div class="portfolio-pack-controls"><button class="portfolio-prev" aria-label="Previous image"><i class="bx bx-left-arrow-alt"></i></button><button class="portfolio-next" aria-label="Next image"><i class="bx bx-right-arrow-alt"></i></button></div></div>`;
        const swiper = document.createElement('div');
        swiper.className = 'portfolio-swiper swiper';
        swiper.appendChild(wrapper);
        pack.appendChild(swiper);
        portfolioContainer.appendChild(pack);
        portfolioSwipers.push(new Swiper(swiper, {
          loop: groupItems.length > 2,
          speed: 750,
          spaceBetween: 18,
          slidesPerView: 1.15,
          autoplay: { delay: 3200, disableOnInteraction: false, pauseOnMouseEnter: true },
          navigation: { nextEl: pack.querySelector('.portfolio-next'), prevEl: pack.querySelector('.portfolio-prev') },
          breakpoints: { 640: { slidesPerView: 2.15 }, 992: { slidesPerView: 3.15 } }
        }));
      });

      select('.portfolio-lightbox', true).forEach((lightboxLink) => {
        lightboxLink.removeAttribute('title');
        lightboxLink.removeAttribute('data-title');
        lightboxLink.removeAttribute('data-description');
      });

      const portfolioLightbox = GLightbox({
        selector: '.portfolio-lightbox',
        descPosition: 'none'
      });

      portfolioItems.forEach((portfolioItem) => {
        const image = portfolioItem.querySelector('img');
        const lightboxLinks = select('.portfolio-lightbox', true);
        const imageIndex = lightboxLinks.indexOf(portfolioItem.querySelector('.portfolio-lightbox'));
        if (!image || imageIndex < 0) return;
        image.addEventListener('click', () => portfolioLightbox.openAt(imageIndex));
      });

      const portfolioFilters = select('#portfolio-flters li', true);
      on('click', '#portfolio-flters li', function(e) {
        e.preventDefault();
        portfolioFilters.forEach((filter) => filter.classList.remove('filter-active'));
        this.classList.add('filter-active');
        portfolioSwipers.forEach((swiper) => swiper.autoplay.stop());
        select('.portfolio-pack', true).forEach((pack) => {
          pack.hidden = pack.dataset.filter !== this.getAttribute('data-filter');
        });
        const activePack = select(`.portfolio-pack[data-filter="${this.getAttribute('data-filter')}"]`);
        if (activePack) {
          const activeSwiper = portfolioSwipers.find((swiper) => swiper.el.closest('.portfolio-pack') === activePack);
          if (activeSwiper) activeSwiper.autoplay.start();
        }
      }, true);

      select('.portfolio-pack', true).forEach((pack, index) => {
        pack.hidden = index !== 0;
      });
      if (portfolioSwipers[0]) portfolioSwipers[0].autoplay.start();
    }

  });

  select('.contact-action', true).forEach((contactAction) => {
    contactAction.addEventListener('pointerenter', () => contactAction.classList.add('is-engaged'));
    contactAction.addEventListener('pointerleave', () => contactAction.classList.remove('is-engaged'));
    contactAction.addEventListener('focus', () => contactAction.classList.add('is-engaged'));
    contactAction.addEventListener('blur', () => contactAction.classList.remove('is-engaged'));
  });

  const teamDirectory = select('.contact-team .team-directory');
  const teamContent = select('#team-content');
  if (teamDirectory && teamContent) {
    const oldTeamWrapper = teamDirectory.closest('.contact-team');
    teamContent.appendChild(teamDirectory);
    oldTeamWrapper.remove();
    const teamGrid = teamDirectory.querySelector('.team-grid');
    const teamCards = [...teamGrid.querySelectorAll('.team-card')];

    teamCards.forEach((card, index) => {
      card.setAttribute('data-aos', 'zoom-in-up');
      card.setAttribute('data-aos-delay', String(100 + index * 70));

      const emailLink = card.querySelector('.team-contact-links a[href^="mailto:"]');
      const links = card.querySelector('.team-contact-links');
      if (emailLink && links) {
        emailLink.textContent = emailLink.href.replace(/^mailto:/i, '');
        emailLink.removeAttribute('aria-label');
        links.replaceChildren(emailLink);
      }
    });
  }

  const panels = select('.site-panel', true);
  const closePanels = () => {
    panels.forEach((panel) => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    });
    select('.panel-trigger', true).forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));
    document.body.classList.remove('panel-open');
  };

  select('.panel-trigger', true).forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const panel = select(`#${trigger.dataset.panelTarget}`);
      const isOpen = panel.classList.contains('is-open');
      const navbar = select('#navbar');
      if (navbar.classList.contains('navbar-mobile')) {
        navbar.classList.remove('navbar-mobile');
        select('#header').classList.remove('menu-open');
        select('#header').style.zIndex = '';
        navbar.style.zIndex = '';
        navbar.querySelector('ul').style.zIndex = '';
        const navbarToggle = select('.mobile-nav-toggle');
        navbarToggle.classList.add('bi-list');
        navbarToggle.classList.remove('bi-x');
      }
      closePanels();
      if (!isOpen) {
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
        trigger.setAttribute('aria-expanded', 'true');
        document.body.classList.add('panel-open');
        panel.querySelector('.site-panel-close').focus();
      }
    });
  });

  on('click', '[data-panel-close]', closePanels, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanels();
  });

  /**
   * Portfolio details slider
   */
  new Swiper('.portfolio-details-slider', {
    speed: 400,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });

  /**
   * Animation on scroll
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    })
  });

  /**
   * Initiate Pure Counter 
   */
  new PureCounter();

  /**
   * Recruitment section reveal on click
   */
  const recruitmentSection = select('#recruitment');
  const recruitmentLinks = select('a[href="#recruitment"]', true);

  if (recruitmentSection) {
    recruitmentLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        recruitmentSection.classList.add('is-open');
        recruitmentSection.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
          recruitmentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      });
    });

    if (window.location.hash === '#recruitment') {
      recruitmentSection.classList.add('is-open');
      recruitmentSection.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Recruitment form validation
   */
  const recruitmentForm = select('#recruitmentForm');
  if (recruitmentForm) {
    const successMessage = select('#recruitmentSuccess');

    recruitmentForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const formData = new FormData(recruitmentForm);
      const firstName = (formData.get('firstName') || '').toString().trim();
      const lastName = (formData.get('lastName') || '').toString().trim();
      const phone = (formData.get('phone') || '').toString().trim();
      const email = (formData.get('email') || '').toString().trim();
      const about = (formData.get('about') || '').toString().trim();
      const cvFile = formData.get('cvFile');
      const notRobot = formData.get('notRobot');
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!firstName || !lastName || !phone || !email || !about) {
        if (successMessage) successMessage.textContent = 'Please complete all required fields.';
        successMessage.style.color = '#b42318';
        return;
      }

      if (!emailPattern.test(email)) {
        if (successMessage) successMessage.textContent = 'Please enter a valid email address.';
        successMessage.style.color = '#b42318';
        return;
      }

      if (!cvFile || !cvFile.name) {
        if (successMessage) successMessage.textContent = 'Please attach your CV.';
        successMessage.style.color = '#b42318';
        return;
      }

      if (!notRobot) {
        if (successMessage) successMessage.textContent = 'Please confirm that the information is correct.';
        successMessage.style.color = '#b42318';
        return;
      }

      const turnstileResponse = formData.get('cf-turnstile-response');
      if (!turnstileResponse) {
        if (successMessage) successMessage.textContent = 'Please complete the security check.';
        successMessage.style.color = '#b42318';
        return;
      }

      const submitButton = recruitmentForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      fetch(recruitmentForm.action, {
        method: 'POST',
        body: formData
      })
        .then((response) => response.json())
        .then((result) => {
          if (successMessage) {
            successMessage.textContent = result.message || 'The application could not be sent.';
            successMessage.style.color = result.success ? '#0f8a5f' : '#b42318';
          }
          if (result.success) {
            recruitmentForm.reset();
            if (window.turnstile) window.turnstile.reset();
          }
        })
        .catch(() => {
          if (successMessage) {
            successMessage.textContent = 'The application could not be sent. Please try again later.';
            successMessage.style.color = '#b42318';
          }
        })
        .finally(() => {
          if (submitButton) submitButton.disabled = false;
        });
    });
  }
})()
