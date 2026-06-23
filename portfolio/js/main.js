/**
 * Portfolio — Main JavaScript
 * Sai Mukundhan Madhavan
 * Handles: Typing effect, scroll reveals, navbar, particle canvas,
 *          stat counters, skill bars, mobile menu, form feedback
 */

'use strict';

/* ============================================================
   TYPING EFFECT
   ============================================================ */
const typingEl = document.getElementById('typing-text');
const phrases = [
  'Embedded Systems Engineer',
  'IoT Architect',
  'LoRaWAN Specialist',
  'STM32 & ESP32 Developer',
  'Wireless Comm. Enthusiast',
  'Smart Sensor Systems Builder',
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingTimeout;

function type() {
  const current = phrases[phraseIndex];

  if (isDeleting) {
    typingEl.textContent = current.substring(0, charIndex - 1);
    charIndex--;
  } else {
    typingEl.textContent = current.substring(0, charIndex + 1);
    charIndex++;
  }

  let speed = isDeleting ? 45 : 90;

  if (!isDeleting && charIndex === current.length) {
    speed = 1800;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    speed = 300;
  }

  typingTimeout = setTimeout(type, speed);
}

type();

/* ============================================================
   PARTICLE CANVAS
   ============================================================ */
const canvas = document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animFrameId;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  initParticles();
});

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.color = Math.random() > 0.5 ? '0,240,255' : '255,0,170';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
      this.reset();
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
    ctx.fill();
  }
}

function initParticles() {
  const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
  particles = Array.from({ length: count }, () => new Particle());
}

function connectParticles() {
  const maxDist = 120;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const alpha = (1 - dist / maxDist) * 0.15;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(0,240,255,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  connectParticles();
  animFrameId = requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

/* ============================================================
   NAVBAR — Scroll + Active + Hamburger
   ============================================================ */
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navMobile = document.getElementById('navMobile');
const navLinks = document.querySelectorAll('.nav-links a');
const mobileLinks = document.querySelectorAll('.mobile-link');
const sections = document.querySelectorAll('section[id]');

// Scroll: add background + detect active section
window.addEventListener('scroll', () => {
  // Navbar scroll class
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  // Active section highlight
  let current = '';
  sections.forEach(sec => {
    const sectionTop = sec.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = sec.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
}, { passive: true });

// Hamburger toggle
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navMobile.classList.toggle('open');
});

// Close mobile menu on link click
mobileLinks.forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navMobile.classList.remove('open');
  });
});

// Nav logo scroll to top
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ============================================================
   SCROLL REVEAL — IntersectionObserver
   ============================================================ */
const fadeEls = document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px',
});

fadeEls.forEach(el => revealObserver.observe(el));

/* ============================================================
   SKILL BARS — Animate on visible
   ============================================================ */
const skillBars = document.querySelectorAll('.skill-bar-fill');

const skillObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const bar = entry.target;
      const width = bar.getAttribute('data-width');
      setTimeout(() => {
        bar.style.width = width + '%';
      }, 150);
      skillObserver.unobserve(bar);
    }
  });
}, { threshold: 0.4 });

skillBars.forEach(bar => skillObserver.observe(bar));

/* ============================================================
   STAT COUNTER — Animate on visible
   ============================================================ */
const statNumbers = document.querySelectorAll('.stat-number[data-target]');

function animateCounter(el, target, duration = 1200) {
  const start = 0;
  const step = (timestamp) => {
    if (!el._startTime) el._startTime = timestamp;
    const elapsed = timestamp - el._startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * ease) + '+';
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-target'), 10);
      animateCounter(el, target);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

statNumbers.forEach(el => counterObserver.observe(el));

/* ============================================================
   CONTACT FORM — Feedback
   ============================================================ */
const contactForm = document.getElementById('contact-form');
const submitBtn = document.getElementById('contact-submit');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const message = document.getElementById('contact-message').value.trim();

  if (!name || !email || !message) {
    showFormFeedback('Please fill in all required fields.', 'error');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFormFeedback('Please enter a valid email address.', 'error');
    return;
  }

  // Simulate sending
  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Sending...';

  setTimeout(() => {
    showFormFeedback('Message sent! I\'ll get back to you soon. 🚀', 'success');
    contactForm.reset();
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Send Message';
  }, 1500);
});

function showFormFeedback(message, type) {
  // Remove existing
  const existing = document.getElementById('form-feedback');
  if (existing) existing.remove();

  const el = document.createElement('p');
  el.id = 'form-feedback';
  el.textContent = message;
  el.style.cssText = `
    margin-top: 12px;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: var(--font-mono);
    letter-spacing: 0.05em;
    border: 1px solid ${type === 'success' ? 'rgba(57,255,20,0.4)' : 'rgba(255,0,170,0.4)'};
    color: ${type === 'success' ? '#39ff14' : '#ff00aa'};
    background: ${type === 'success' ? 'rgba(57,255,20,0.06)' : 'rgba(255,0,170,0.06)'};
    transition: opacity 0.3s ease;
  `;

  contactForm.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

/* ============================================================
   SMOOTH SCROLL for all anchor links
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ============================================================
   PARALLAX — Hero orbs subtle mouse follow
   ============================================================ */
const heroSection = document.getElementById('hero');
const orb1 = document.querySelector('.hero-orb-1');
const orb2 = document.querySelector('.hero-orb-2');
const orb3 = document.querySelector('.hero-orb-3');

heroSection.addEventListener('mousemove', (e) => {
  const { clientX, clientY } = e;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = (clientX - cx) / cx;
  const dy = (clientY - cy) / cy;

  orb1.style.transform = `translate(${dx * 20}px, ${dy * 15}px)`;
  orb2.style.transform = `translate(${dx * -15}px, ${dy * -20}px)`;
  orb3.style.transform = `translate(${dx * 10}px, ${dy * 10}px)`;
}, { passive: true });

heroSection.addEventListener('mouseleave', () => {
  orb1.style.transform = '';
  orb2.style.transform = '';
  orb3.style.transform = '';
});

/* ============================================================
   CURSOR GLOW TRAIL (subtle)
   ============================================================ */
const trail = document.createElement('div');
trail.style.cssText = `
  position: fixed;
  width: 300px; height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,240,255,0.04) 0%, transparent 70%);
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 9999;
  transition: left 0.15s ease, top 0.15s ease;
  will-change: transform;
`;
document.body.appendChild(trail);

window.addEventListener('mousemove', (e) => {
  trail.style.left = e.clientX + 'px';
  trail.style.top = e.clientY + 'px';
}, { passive: true });
