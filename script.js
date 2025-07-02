class OrbitalDatePicker {
  constructor() {
    this.earth = document.querySelector(".earth-image");
    this.earthContainer = document.querySelector(".earth-container");
    this.dateOutput = document.getElementById("dateOutput");
    this.angleDisplay = document.getElementById("angle");
    this.dobForm = document.getElementById("dobForm");
    this.result = document.getElementById("result");
    this.ageResult = document.getElementById("ageResult");

    this.isDragging = false;
    this.currentAngle = 0;
    this.previousAngle = 0;
    this.totalRotations = 0; // Track complete orbits
    this.baseYear = new Date().getFullYear();
    this.selectedDate = new Date();

    // Responsive elliptical orbit parameters
    this.updateOrbitParameters();

    this.init();
  }

  updateOrbitParameters() {
    // Get current earth container dimensions for responsive calculations
    const containerRect = this.earthContainer
      ? this.earthContainer.getBoundingClientRect()
      : { width: 300, height: 200 };

    // Adjust orbit parameters based on screen size
    if (window.innerWidth <= 480) {
      this.semiMajorAxis = 105; // Smaller for mobile
      this.semiMinorAxis = 70;
    } else if (window.innerWidth <= 768) {
      this.semiMajorAxis = 120; // Medium for tablet
      this.semiMinorAxis = 80;
    } else {
      this.semiMajorAxis = 150; // Full size for desktop
      this.semiMinorAxis = 100;
    }

    this.focalDistance = Math.sqrt(
      this.semiMajorAxis * this.semiMajorAxis -
        this.semiMinorAxis * this.semiMinorAxis
    );
    this.eccentricity = this.focalDistance / this.semiMajorAxis;
  }

  init() {
    // Start with current date
    this.setCurrentDate();
    this.setupEventListeners();
    this.updateDisplay();

    // Handle window resize
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  handleResize() {
    this.updateOrbitParameters();
    this.updateEarthPosition();
  }

  setCurrentDate() {
    const today = new Date();
    const dayOfYear = this.getDayOfYear(today);
    this.currentAngle = (dayOfYear / 365) * 360;
    this.previousAngle = this.currentAngle;
    this.totalRotations = 0;
    this.updateEarthPosition();
  }

  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  setupEventListeners() {
    // Mouse events
    this.earth.addEventListener("mousedown", this.handleMouseDown.bind(this));
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("mouseup", this.handleMouseUp.bind(this));

    // Touch events for mobile
    this.earth.addEventListener("touchstart", this.handleTouchStart.bind(this));
    document.addEventListener("touchmove", this.handleTouchMove.bind(this));
    document.addEventListener("touchend", this.handleTouchEnd.bind(this));

    // Prevent default drag behavior
    this.earth.addEventListener("dragstart", (e) => e.preventDefault());

    // Keyboard controls
    document.addEventListener("keydown", this.handleKeyPress.bind(this));

    // Form submission
    this.dobForm.addEventListener("submit", this.handleFormSubmit.bind(this));
  }

  handleMouseDown(e) {
    e.preventDefault();
    this.isDragging = true;
    this.earth.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    this.updateAngleFromPosition(e.clientX, e.clientY);
  }

  handleMouseUp() {
    this.isDragging = false;
    document.body.style.userSelect = "";
  }

  handleTouchStart(e) {
    e.preventDefault();
    this.isDragging = true;
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.updateAngleFromPosition(touch.clientX, touch.clientY);
  }

  handleTouchEnd(e) {
    e.preventDefault();
    this.isDragging = false;
  }

  updateAngleFromPosition(clientX, clientY) {
    const rect = this.earthContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    // Calculate angle in radians, then convert to degrees
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Normalize to 0-360 degrees
    angle = (angle + 360) % 360;

    // Detect full rotations (orbit crossings)
    this.detectOrbitCrossing(angle);

    this.currentAngle = angle;
    this.updateEarthPosition();
    this.updateDisplay();
  }

  detectOrbitCrossing(newAngle) {
    const angleDiff = newAngle - this.previousAngle;

    // Detect crossing from ~360° to ~0° (clockwise - forward in time)
    if (this.previousAngle > 270 && newAngle < 90 && angleDiff < -180) {
      this.totalRotations++;
      console.log(
        "Completed orbit forward! Year:",
        this.baseYear + this.totalRotations
      );
    }
    // Detect crossing from ~0° to ~360° (counterclockwise - backward in time)
    else if (this.previousAngle < 90 && newAngle > 270 && angleDiff > 180) {
      this.totalRotations--;
      console.log(
        "Completed orbit backward! Year:",
        this.baseYear + this.totalRotations
      );
    }

    this.previousAngle = newAngle;
  }

  updateEarthPosition() {
    // Convert angle to radians
    const angleRad = this.currentAngle * (Math.PI / 180);

    // Calculate elliptical position using parametric equations
    // Keep ellipse centered, sun is offset separately
    const x = this.semiMajorAxis * Math.cos(angleRad);
    const y = this.semiMinorAxis * Math.sin(angleRad);

    // Position Earth relative to the center of earth-container
    this.earth.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  updateDisplay() {
    // Calculate current year based on total rotations
    const currentYear = this.baseYear + this.totalRotations;

    // Calculate distance from sun for Kepler's law info
    const angleRad = this.currentAngle * (Math.PI / 180);
    const earthX = this.semiMajorAxis * Math.cos(angleRad);
    const earthY = this.semiMinorAxis * Math.sin(angleRad);
    const sunX = -this.focalDistance; // Sun at left focus
    const sunY = 0;
    const distanceFromSun = Math.sqrt(
      (earthX - sunX) ** 2 + (earthY - sunY) ** 2
    );

    // Calculate date based on angle within the current year
    // Apply Kepler's second law: areas swept in equal times are equal
    // This means Earth moves faster when closer to sun (perihelion)
    const meanAnomaly = this.currentAngle;
    const dayOfYear = Math.floor((meanAnomaly / 360) * 365) + 1;
    this.selectedDate = this.getDateFromDayOfYear(dayOfYear, currentYear);

    // Update date display
    this.dateOutput.textContent = this.selectedDate.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    // Update angle display with orbital mechanics info (if element exists)
    if (this.angleDisplay) {
      const speed =
        distanceFromSun < this.semiMajorAxis
          ? "Fast (Perihelion)"
          : "Slow (Aphelion)";
      this.angleDisplay.textContent = `${Math.round(
        this.currentAngle
      )}° | Year: ${currentYear} | Speed: ${speed}`;
    }
  }

  getDateFromDayOfYear(dayOfYear, year) {
    const date = new Date(year, 0, 1);
    date.setDate(dayOfYear);
    return date;
  }

  handleKeyPress(e) {
    // Arrow key controls for fine adjustment
    switch (e.key) {
      case "ArrowLeft":
        const newAngleLeft = (this.currentAngle - 2 + 360) % 360;
        this.detectOrbitCrossing(newAngleLeft);
        this.currentAngle = newAngleLeft;
        this.updateEarthPosition();
        this.updateDisplay();
        break;
      case "ArrowRight":
        const newAngleRight = (this.currentAngle + 2) % 360;
        this.detectOrbitCrossing(newAngleRight);
        this.currentAngle = newAngleRight;
        this.updateEarthPosition();
        this.updateDisplay();
        break;
      case "ArrowUp":
        // Quick year forward
        this.totalRotations++;
        this.updateDisplay();
        break;
      case "ArrowDown":
        // Quick year backward
        this.totalRotations--;
        this.updateDisplay();
        break;
    }
  }

  handleFormSubmit(e) {
    e.preventDefault();

    // Calculate age
    const today = new Date();
    const birthDate = this.selectedDate;

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    // Show result
    this.showResult(age, birthDate);
  }

  showResult(age, birthDate) {
    const formattedDate = birthDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const ageText =
      age >= 0
        ? `You are <strong>${age} years old</strong>! 🎂`
        : `You will be born in <strong>${Math.abs(age)} years</strong>! 🎂`;

    this.ageResult.innerHTML = `
      You were born on <strong>${formattedDate}</strong><br>
      ${ageText}
    `;

    this.result.style.display = "block";
    this.result.scrollIntoView({ behavior: "smooth" });

    // Add some celebration animation
    this.celebrateAge();
  }

  celebrateAge() {
    // Make the earth spin in celebration
    this.earth.style.animation = "earth-celebrate 2s ease-in-out";

    // Add celebration keyframes if not already present
    if (!document.querySelector("#celebration-styles")) {
      const style = document.createElement("style");
      style.id = "celebration-styles";
      style.textContent = `
        @keyframes earth-celebrate {
          0%, 100% { transform: translate(-50%, -100px) scale(1) rotate(0deg); }
          25% { transform: translate(-50%, -100px) scale(1.3) rotate(90deg); }
          50% { transform: translate(-50%, -100px) scale(1.1) rotate(180deg); }
          75% { transform: translate(-50%, -100px) scale(1.3) rotate(270deg); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      this.earth.style.animation = "";
      this.updateEarthPosition(); // Restore proper position
    }, 2000);
  }
}

// Initialize the orbital date picker when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new OrbitalDatePicker();
});

// System initialization message
console.log(`
ORBITAL CALCULATION SYSTEM - MODEL 2024
COMPUTER ASSISTED TEMPORAL POSITIONING
DESIGNED FOR ELECTRONIC COMPUTATION MACHINES
STATUS: OPERATIONAL
`);
