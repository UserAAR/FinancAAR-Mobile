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

function nextSlide() {
  currentIndex = (currentIndex + 1) % slides.length;
  updateCarousel(currentIndex);
}

let autoplay = setInterval(nextSlide, 5000);

function resetTimer() {
  clearInterval(autoplay);
  autoplay = setInterval(nextSlide, 5000);
} 