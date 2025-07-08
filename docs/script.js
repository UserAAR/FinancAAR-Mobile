// Update footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Basic carousel implementation
const slidesContainer = document.querySelector('.slides');
const indicatorsContainer = document.getElementById('indicators');
const slides = Array.from(slidesContainer.children);
let currentIndex = 0;

function updateCarousel(index) {
  const offset = -index * slides[0].clientWidth;
  slidesContainer.style.transform = `translateX(${offset}px)`;
  Array.from(indicatorsContainer.children).forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

// Create indicators
const totalSlides = slides.length;
for (let i = 0; i < totalSlides; i++) {
  const dot = document.createElement('span');
  dot.addEventListener('click', () => {
    currentIndex = i;
    updateCarousel(currentIndex);
  });
  indicatorsContainer.appendChild(dot);
}
updateCarousel(0);

// Auto-play every 5 seconds
let autoplay = setInterval(() => {
  currentIndex = (currentIndex + 1) % slides.length;
  updateCarousel(currentIndex);
}, 5000);

function resetTimer() {
  clearInterval(autoplay);
  autoplay = setInterval(() => {
    currentIndex = (currentIndex + 1) % slides.length;
    updateCarousel(currentIndex);
  }, 5000);
}

const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');

prevBtn.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
  updateCarousel(currentIndex);
  resetTimer();
});

nextBtn.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % totalSlides;
  updateCarousel(currentIndex);
  resetTimer();
}); 