/* ============================================
   TATVA – MODERN DINING | JavaScript
   ============================================ */

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? (window.location.port === '5000' || window.location.port === '8000' ? '/api' : 'http://127.0.0.1:5000/api')
    : 'https://tatvabegumpet.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {

    // ---------- Navbar Scroll Effect ----------
    const navbar = document.getElementById('navbar');

    const handleScroll = () => {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ---------- Mobile Menu Toggle ----------
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // ---------- Smooth Scroll for Anchor Links ----------
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                const navHeight = navbar.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ---------- Scroll Reveal with IntersectionObserver ----------
    const revealElements = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ---------- Stagger Animation for Grid Items ----------
    const staggerContainers = document.querySelectorAll('.dining-grid, .trust-grid, .service-list');

    staggerContainers.forEach(container => {
        const items = container.querySelectorAll('.reveal');
        items.forEach((item, index) => {
            item.style.transitionDelay = `${index * 0.1}s`;
        });
    });

    // ---------- Parallax Effect on Hero ----------
    const heroBg = document.querySelector('.hero-bg img');

    if (heroBg && window.innerWidth > 768) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const heroHeight = document.querySelector('.hero').offsetHeight;
            if (scrolled < heroHeight) {
                heroBg.style.transform = `scale(${1.1 + scrolled * 0.0002}) translateY(${scrolled * 0.15}px)`;
            }
        }, { passive: true });
    }

    // ---------- Active Nav Link Highlight ----------
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-links a');

    const highlightNav = () => {
        const scrollPos = window.scrollY + navbar.offsetHeight + 100;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollPos >= top && scrollPos < top + height) {
                navItems.forEach(item => {
                    item.style.color = '';
                    if (item.getAttribute('href') === `#${id}`) {
                        item.style.color = 'var(--gold)';
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', highlightNav, { passive: true });

    // ---------- Counter Animation for Stats ----------
    const statNumbers = document.querySelectorAll('.stat-number');

    const animateCounter = (el) => {
        const text = el.textContent;
        const match = text.match(/^([\d,]+)/);
        if (!match) return;

        const target = parseInt(match[1].replace(/,/g, ''));
        const suffix = text.replace(match[1], '');
        const duration = 2000;
        const start = performance.now();

        const update = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * eased);
            el.textContent = current.toLocaleString() + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    };

    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                statObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => statObserver.observe(el));

    // ---------- Dynamic Menu Fetch ----------
    const menuContainer = document.getElementById('fullMenuContainer');
    const categoriesContainer = document.getElementById('menuCategories');

    if (menuContainer) {
        fetch(`${API_URL}/menu`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                renderMenu(data);
            })
            .catch(err => {
                console.error('Failed to load menu:', err);
                menuContainer.innerHTML = `<p style="text-align:center;width:100%;">Failed to load menu data (Error: ${err.message}). Please ensure the backend is running.</p>`;
            });
    }

    function renderMenu(menuData) {
        categoriesContainer.innerHTML = '';
        menuContainer.innerHTML = '';

        const categories = Object.keys(menuData);
        if (categories.length === 0) {
            menuContainer.innerHTML = '<p>No menu items available at the moment.</p>';
            return;
        }

        // --- Render Categories Filter ---
        // Make the first category active by default
        let activeCategory = categories[0];

        categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline';
            if (category === activeCategory) {
                btn.style.backgroundColor = 'var(--gold)';
                btn.style.borderColor = 'var(--gold)';
                btn.style.color = 'var(--white)';
            } else {
                btn.style.borderColor = 'var(--gold)';
                btn.style.color = 'var(--gold)';
            }
            btn.textContent = category;

            btn.addEventListener('click', () => {
                // Update active styles
                Array.from(categoriesContainer.children).forEach(c => {
                    c.style.backgroundColor = 'transparent';
                    c.style.color = 'var(--gold)';
                });
                btn.style.backgroundColor = 'var(--gold)';
                btn.style.color = 'var(--white)';

                // Show matching menu category
                document.querySelectorAll('.menu-category-section').forEach(sec => {
                    sec.style.display = 'none';
                });
                document.getElementById(`cat-${category.replace(/[^a-zA-Z0-9]/g, '')}`).style.display = 'block';
            });
            categoriesContainer.appendChild(btn);
        });

        // --- Render Menu Items ---
        categories.forEach(category => {
            const catDiv = document.createElement('div');
            catDiv.className = 'menu-category-section';
            catDiv.id = `cat-${category.replace(/[^a-zA-Z0-9]/g, '')}`;
            catDiv.style.display = category === activeCategory ? 'block' : 'none';

            let itemsHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">`;

            menuData[category].forEach(item => {
                itemsHtml += `
                    <div style="background: var(--white); border: 1px solid var(--gold-light); border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                                <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 500; color: var(--text-dark); margin:0;">${item.name}</h3>
                                <span style="font-weight: 600; color: var(--gold); border-bottom: 1px dotted var(--gold); padding-bottom: 2px;">₹${item.price.toFixed(0)}</span>
                            </div>
                            ${item.description ? `<p style="font-size: 0.875rem; color: var(--text-light); line-height: 1.5; margin:0;">${item.description}</p>` : ''}
                        </div>
                    </div>
                `;
            });

            itemsHtml += `</div>`;
            catDiv.innerHTML = itemsHtml;
            menuContainer.appendChild(catDiv);
        });
    }

    // ---------- Reservation Form Handling ----------
    const resForm = document.getElementById('reservationForm');
    const resStatusMsg = document.getElementById('resStatusMsg');

    if (resForm) {
        resForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                name: document.getElementById('resName').value,
                phone: document.getElementById('resPhone').value,
                date: document.getElementById('resDate').value,
                time: document.getElementById('resTime').value,
                guests: document.getElementById('resGuests').value
            };

            const btn = resForm.querySelector('button[type="submit"]');
            btn.textContent = 'Submitting...';
            btn.disabled = true;

            try {
                const res = await fetch(`${API_URL}/reservations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    resStatusMsg.textContent = 'Reservation requesting received! We will confirm shortly.';
                    resStatusMsg.style.color = 'green';
                    resForm.reset();
                } else {
                    resStatusMsg.textContent = data.error || 'Failed to submit reservation.';
                    resStatusMsg.style.color = 'red';
                }
            } catch (err) {
                resStatusMsg.textContent = 'Network error. Please try calling us.';
                resStatusMsg.style.color = 'red';
            } finally {
                resStatusMsg.style.display = 'block';
                btn.textContent = 'Request Reservation';
                btn.disabled = false;

                setTimeout(() => {
                    resStatusMsg.style.display = 'none';
                }, 5000);
            }
        });
    }
});
