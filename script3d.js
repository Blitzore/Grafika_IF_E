// Menggunakan instansi THREE global yang dimuat via script tag di index.html

let scene, camera, renderer;
let object;
let scale3D = 1;
let translation = { x: 0, y: 0, z: 0 };
let objectWidth = 1;
let objectHeight = 2;
let objectMaterial;
let isTranslating = false;

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Add activeObjectType variable to track the current object
let activeObjectType = "cube"; // Default to cube

// Inisialisasi scene
function init() {
  console.log("Initializing 3D scene...");
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
    camera.position.z = 5;

    const canvas = document.getElementById("canvas3d");
    if (!canvas) {
      console.error("Canvas 3D element not found!");
      return;
    }

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setClearColor(0xffffff);
    renderer.setSize(1200, 600);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Better lighting
    const ambientLight = new THREE.AmbientLight(0x909090);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Add a subtle fill light from the opposite direction
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    // Improved mouse controls with better event handling
    canvas.addEventListener("mousedown", (e) => {
      if (!object) return;
      
      isDragging = true;
      
      // Use clientX/Y and calculate relative position to canvas
      const rect = canvas.getBoundingClientRect();
      previousMousePosition = { 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      };
      
      // Change cursor style based on current mode
      canvas.style.cursor = isTranslating ? "move" : "grabbing";
      
      console.log("3D Mouse down:", previousMousePosition, "Mode:", isTranslating ? "Translating" : "Rotating");
    });

    canvas.addEventListener("mouseup", () => {
      isDragging = false;
      // Reset cursor based on current mode
      canvas.style.cursor = isTranslating ? "grab" : "default";
      console.log("3D Mouse up");
    });

    canvas.addEventListener("mouseleave", () => {
      if (isDragging) {
        isDragging = false;
        canvas.style.cursor = isTranslating ? "grab" : "default";
        console.log("3D Mouse leave");
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!isDragging || !object) return;

      // Use clientX/Y and calculate relative position to canvas
      const rect = canvas.getBoundingClientRect();
      const currentPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      const deltaMove = {
        x: currentPosition.x - previousMousePosition.x,
        y: currentPosition.y - previousMousePosition.y,
      };

      // Simple logging to debug movement
      if (Math.abs(deltaMove.x) > 1 || Math.abs(deltaMove.y) > 1) {
        console.log("3D Mouse move delta:", deltaMove, "Mode:", isTranslating ? "Translating" : "Rotating");
      }

      // Scale movements based on canvas size
      const canvasSize = Math.min(canvas.width, canvas.height);
      const sensitivityFactor = 2 / canvasSize;
      
      if (isTranslating) {
        // Direct translation (scaled appropriately)
        translation.x += deltaMove.x * sensitivityFactor * 2;
        translation.y -= deltaMove.y * sensitivityFactor * 2; // Invert Y axis
      } else {
        // Rotation (y-axis for horizontal mouse movement, x-axis for vertical)
        object.rotation.y += deltaMove.x * sensitivityFactor * 2;
        object.rotation.x += deltaMove.y * sensitivityFactor * 2;
      }

      previousMousePosition = currentPosition;
    });

    // Add mouse wheel event for scaling with Ctrl key
    canvas.addEventListener("wheel", (e) => {
      if (e.ctrlKey && object) {
        e.preventDefault();
        const scaleFactor = e.deltaY > 0 ? -0.1 : 0.1;
        scale3d(scaleFactor);
      }
    });

    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);

    animate();
    createObject("cube"); // Create default object
    
    // Hide loading screen
    const loadingElement = document.getElementById("loading3d");
    if (loadingElement) {
      loadingElement.style.display = "none";
    }
    
    console.log("3D scene initialized successfully");
  } catch (error) {
    console.error("Error initializing 3D scene:", error);
    if (typeof window.displayDetailedError === "function") {
      window.displayDetailedError(error.message, "script3d.js [originalInit]", error.stack ? error.stack.split('\n')[1] : "");
    }
    // Show error in loading screen
    const loadingElement = document.getElementById("loading3d");
    if (loadingElement) {
      loadingElement.innerHTML = `
        <svg class="icon" style="color: #ff0000; width: 40px; height: 40px;">
          <use href="#error-icon"></use>
        </svg>
        <p>Error loading 3D scene: ${error.message}</p>
        <button onclick="init()" class="retry-button">Try Again</button>
      `;
      loadingElement.style.display = "flex";
    }
  }
}

// Add keyboard controls handler
function handleKeyDown(e) {
  // Skip if we're in an input field
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  // Skip if 2D mode is active
  if (document.getElementById('section3d').style.display === 'none') return;
  
  const step = 0.4; // Translation step
  const rotationStep = 0.1; // Rotation step
  
  // Translation with arrow keys
  if (!e.ctrlKey && !e.shiftKey) {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        translation.y += step;
        break;
      case 'ArrowDown':
        e.preventDefault();
        translation.y -= step;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        translation.x -= step;
        break;
      case 'ArrowRight':
        e.preventDefault();
        translation.x += step;
        break;
    }
  }
  
  // Rotation with Ctrl+Shift+Arrow keys
  if (e.ctrlKey && e.shiftKey) {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (object) object.rotation.x -= rotationStep;
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (object) object.rotation.x += rotationStep;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (object) object.rotation.y -= rotationStep;
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (object) object.rotation.y += rotationStep;
        break;
    }
    
    // Scale with Ctrl+Shift++ and Ctrl+Shift+-
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      scale3d(0.1);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      scale3d(-0.1);
    }
  }
}

// Loop render with better error handling
function animate() {
  requestAnimationFrame(animate);
  try {
    if (object) {
      object.position.set(translation.x, translation.y, translation.z);
      object.scale.set(scale3D, scale3D, scale3D);
    }
    
    // Add occasional check for duplicate objects (every ~5 seconds)
    if (Math.random() < 0.01) {
      ensureSingleObject();
    }
    
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    } else {
      console.warn("Renderer, scene or camera not initialized in animation loop");
    }
  } catch (error) {
    console.error("Error in animation loop:", error);
  }
}

// Function to ensure only one object is in the scene
function ensureSingleObject() {
  if (!scene) return;
  
  // Count number of Mesh objects in scene
  let meshCount = 0;
  
  scene.children.forEach(child => {
    if (child.type === 'Mesh' && !child.userData.isHelper) {
      meshCount++;
    }
  });
  
  // If more than one mesh, clean up extras
  if (meshCount > 1) {
    console.warn(`Found ${meshCount} meshes in scene, cleaning up extras`);
    
    // Keep track of objects to remove
    const toRemove = [];
    
    scene.children.forEach(child => {
      if (child.type === 'Mesh' && child !== object && !child.userData.isHelper) {
        toRemove.push(child);
      }
    });
    
    // Remove extras
    toRemove.forEach(child => {
      console.log("Removing duplicate mesh:", child);
      scene.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}

// Buat objek 3D - simplified and more robust
window.createObject = function (type) {
  console.log(`Creating 3D object: ${type}`);
  
  // Update UI buttons to reflect current object selection
  updateObjectSelectionUI(type);
  
  // Set the active object type
  activeObjectType = type;
  
  // Verify scene exists
  if (!scene) {
    console.error("Cannot create object: Scene not initialized");
    return;
  }
  
  if (!["cube", "tabung", "limas"].includes(type)) {
    console.error(`Invalid object type: ${type}`);
    return;
  }

  try {
    // Remove existing object if any
    if (object) {
      console.log("Removing existing object from scene");
      scene.remove(object);
      // Dispose of geometry and material to prevent memory leaks
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
    }

    // Reset translation to center the new object
    translation = { x: 0, y: 0, z: 0 };
    
    console.log(`Creating geometry for ${type} with width=${objectWidth}, height=${objectHeight}`);
    
    // Create geometry with fallback values if dimensions are invalid
    const safeWidth = isNaN(objectWidth) || objectWidth <= 0 ? 1 : objectWidth;
    const safeHeight = isNaN(objectHeight) || objectHeight <= 0 ? 2 : objectHeight;
    
    let geometry;
    if (type === "cube") {
      geometry = new THREE.BoxGeometry(safeWidth, safeHeight, safeWidth);
    } else if (type === "tabung") {
      geometry = new THREE.CylinderGeometry(
        safeWidth,
        safeWidth,
        safeHeight,
        32
      );
    } else if (type === "limas") {
      geometry = new THREE.ConeGeometry(safeWidth, safeHeight, 4);
    }

    if (!geometry) {
      throw new Error(`Failed to create geometry for ${type}`);
    }

    // Get color with fallback
    let colorValue = "#00ff00"; // Default fallback color
    try {
      const colorInput = document.getElementById("color3d");
      if (colorInput && colorInput.value) {
        const inputColor = colorInput.value;
        if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(inputColor)) {
          colorValue = inputColor;
        }
      }
    } catch (colorError) {
      console.warn("Error getting color, using default:", colorError);
    }

    console.log(`Creating material with color ${colorValue}`);
    
    // Create material with simpler properties to avoid issues
    objectMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorValue),
      metalness: 0.2,
      roughness: 0.7,
    });

    // Create the mesh and add to scene
    object = new THREE.Mesh(geometry, objectMaterial);
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData = { type: type }; // Store object type in userData for easier tracking
    
    console.log("Adding object to scene");
    scene.add(object);
    
    // Reset transform
    resetTransform3d();
    
    // Force a render
    renderer.render(scene, camera);
    
    console.log(`Object ${type} created successfully`);
    
    // Hide any error messages that might be showing
    const loadingElement = document.getElementById("loading3d");
    if (loadingElement) {
      loadingElement.style.display = "none";
    }
  } catch (error) {
    console.error(`Error creating object ${type}:`, error);
    
    // Show error to user
    const loadingElement = document.getElementById("loading3d");
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div style="background: rgba(255,0,0,0.1); padding: 10px; border-radius: 5px; text-align: center;">
          <p>Error creating 3D object: ${error.message}</p>
          <button onclick="createObject('cube')" style="padding: 5px 10px; margin-top: 5px;">Try Again</button>
        </div>
      `;
      loadingElement.style.display = "flex";
    }
  }
};

// Ukuran objek
window.updateSize = function () {
  const width = parseFloat(document.getElementById("inputWidth").value);
  const height = parseFloat(document.getElementById("inputHeight").value);

  if (width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) return;

  objectWidth = width;
  objectHeight = height;

  if (object) {
    const currentType = object.geometry.type;
    let type;
    if (currentType.includes("Box")) type = "cube";
    else if (currentType.includes("Cylinder")) type = "tabung";
    else if (currentType.includes("Cone")) type = "limas";
    createObject(type);
  }
};

// Reset semua
window.resetAll = function () {
  // Get current object type before reset
  const currentType = activeObjectType;
  console.log(`Resetting 3D object. Current type: ${currentType}`);
  
  // Reset dimensions and transforms
  objectWidth = 1;
  objectHeight = 2;
  scale3D = 1;
  translation = { x: 0, y: 0, z: 0 };

  // Reset UI inputs
  document.getElementById("inputWidth").value = 1;
  document.getElementById("inputHeight").value = 2;
  document.getElementById("color3d").value = "#00ff00";

  // Recreate the current object type with default parameters
  if (object) {
    scene.remove(object);
    createObject(currentType);
  }
};

window.clearCanvas3D = function () {
  if (object) {
    scene.remove(object);
    object.geometry.dispose();
    object.material.dispose();
    object = null;
    console.log("Canvas 3D dibersihkan.");
  }
};


// Kontrol rotasi
window.rotate3d = function (direction) {
  if (!object) {
    createObject(activeObjectType || "cube");
  }
  if (!object) return;

  if (direction === "left") object.rotation.y -= 0.1;
  else if (direction === "right") object.rotation.y += 0.1;
  else if (direction === "up") object.rotation.x -= 0.1;
  else if (direction === "down") object.rotation.x += 0.1;
};

// Translasi
window.translate3d = function (direction) {
  if (!object) {
    createObject(activeObjectType || "cube");
  }
  if (!object) return;

  const step = 0.4;
  if (direction === "up") translation.y += step;
  else if (direction === "down") translation.y -= step;
  else if (direction === "left") translation.x -= step;
  else if (direction === "right") translation.x += step;
};

// Skala
window.scale3d = function (factor) {
  if (!object) {
    createObject(activeObjectType || "cube");
  }
  if (!object) return;

  const newScale = scale3D + factor;
  if (newScale <= 0.1) return;
  scale3D = newScale;
};

// Reset transformasi
window.resetTransform3d = function () {
  translation = { x: 0, y: 0, z: 0 };
  scale3D = 1;
  if (object) {
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.position.set(0, 0, 0);
  }
};

// Ganti warna
window.applyColor3d = function () {
  const colorValue = document.getElementById("color3d").value;
  if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(colorValue)) return;
  if (object) {
    object.material.color.set(colorValue);
  }
};

// Toggle mode mouse - Fixed implementation
window.toggleTranslationMode = function () {
  isTranslating = !isTranslating;
  const button = document.getElementById("toggleModeBtn");
  const canvas = document.getElementById("canvas3d");
  
  if (isTranslating) {
    button.innerHTML = `
      <svg class="icon">
        <use href="#move-icon"></use>
      </svg>
      Mode: Translasi
    `;
    // Update cursor for current mode
    if (canvas) {
      canvas.style.cursor = "grab";
    }
  } else {
    button.innerHTML = `
      <svg class="icon">
        <use href="#rotate-icon"></use>
      </svg>
      Mode: Rotasi
    `;
    // Update cursor for current mode
    if (canvas) {
      canvas.style.cursor = "default";
    }
  }
  
  console.log("3D Mouse mode changed to:", isTranslating ? "Translasi" : "Rotasi");
};

// Add this function for direct mode setting instead of toggling
window.setMouseMode3D = function(mode) {
  // Set mode directly rather than toggling
  if ((mode === 'translate' && !isTranslating) || 
      (mode === 'rotate' && isTranslating)) {
    toggleTranslationMode(); // Use existing toggle function
  }
};

function addKeyboardShortcutsInfo3D() {
  console.log("3D Keyboard shortcuts initialized");
}

function addCanvasCursorStyles() {
  console.log("3D Canvas cursors initialized");
}

// Call this function when the document is loaded - fixed timing
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    try {
      addKeyboardShortcutsInfo3D();
      addCanvasCursorStyles();
      
      // Try to add controls immediately
      if (!addMouseControls3D()) {
        // If failed, try again with longer delay
        console.log("First attempt to add 3D controls failed, retrying...");
        setTimeout(() => {
          try {
            addMouseControls3D();
          } catch (innerErr) {
            console.error("3D controls retry error:", innerErr);
            if (typeof window.displayDetailedError === "function") {
              window.displayDetailedError(innerErr.message, "script3d.js [retry controls]", innerErr.stack ? innerErr.stack.split('\n')[1] : "");
            }
          }
        }, 2000);
      }
      
      // Initialize the UI to match the default mode (not translating)
      if (document.getElementById("toggleModeBtn")) {
        document.getElementById("toggleModeBtn").innerHTML = `
          <svg class="icon">
            <use href="#rotate-icon"></use>
          </svg>
          Mode: Rotasi
        `;
      }
    } catch (err) {
      console.error("3D DOMContentLoaded error:", err);
      if (typeof window.displayDetailedError === "function") {
        window.displayDetailedError(err.message, "script3d.js [DOMContentLoaded]", err.stack ? err.stack.split('\n')[1] : "");
      }
    }
  }, 500); // Reduced delay for faster response
});

// Add mouse control buttons to the 3D controls - improved with fallbacks
function addMouseControls3D() {
  console.log("Adding 3D mouse controls...");
  
  // Try multiple possible selectors to find the control container
  let controlsSection = document.querySelector('#controls3d .left-content-tools .tool-section:nth-child(2)');
  
  // First fallback - try any tool section in left content
  if (!controlsSection) {
    console.log("Primary selector failed, trying first fallback...");
    controlsSection = document.querySelector('#controls3d .left-content-tools .tool-section');
  }
  
  // Second fallback - create a new section if none found
  if (!controlsSection) {
    console.log("All selectors failed, creating new container...");
    const leftTools = document.querySelector('#controls3d .left-content-tools');
    
    if (leftTools) {
      controlsSection = document.createElement('div');
      controlsSection.classList.add('tool-section');
      controlsSection.innerHTML = '<h3>Mouse Controls</h3>';
      leftTools.appendChild(controlsSection);
    } else {
      console.error("Could not find or create controls container");
      return false;
    }
  }
  
  // Log the found container
  console.log("Control section found:", controlsSection);
  
  // Preserve existing title or create new one
  let title = controlsSection.querySelector('h3');
  if (!title) {
    title = document.createElement('h3');
    title.textContent = 'Mouse Controls';
    controlsSection.appendChild(title);
  }
  
  // Clear existing content but keep the title
  controlsSection.innerHTML = '';
  controlsSection.appendChild(title);
  
  // Add rotate and translate buttons with improved styling
  const controlsHTML = `
    <div class="mouse-controls" style="display: flex; gap: 10px; margin-bottom: 10px;">
      <button id="translateMode3D" onclick="setMouseMode3D('translate')" style="flex: 1; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 5px;">
        <svg class="icon" style="width: 16px; height: 16px;">
          <use href="#move-icon"></use>
        </svg>
        <span>Translasi</span>
      </button>
      <button id="rotateMode3D" onclick="setMouseMode3D('rotate')" style="flex: 1; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 5px;">
        <svg class="icon" style="width: 16px; height: 16px;">
          <use href="#rotate-icon"></use>
        </svg>
        <span>Rotasi</span>
      </button>
    </div>
    <div class="mode-info" style="font-size: 0.85rem; margin-top: 0.5rem; text-align: center; color: var(--secondary, #666);">
      Klik dan seret pada kanvas untuk menggunakan mode yang dipilih.<br>
      Anda juga dapat menggunakan keyboard untuk kontrol.
    </div>
  `;
  
  // Add the HTML to the container
  controlsSection.insertAdjacentHTML('beforeend', controlsHTML);
  
  // Set current mode active
  setTimeout(() => {
    const translateButton = document.getElementById('translateMode3D');
    const rotateButton = document.getElementById('rotateMode3D');
    
    if (translateButton && rotateButton) {
      if (isTranslating) {
        translateButton.classList.add('active');
        rotateButton.classList.remove('active');
      } else {
        rotateButton.classList.add('active');
        translateButton.classList.remove('active');
      }
    }
  }, 100);
  
  console.log("3D mouse controls added successfully");
  return true;
}

// Alternative approach - create floating controls if needed
function addFloatingMouseControls() {
  console.log("Adding floating mouse controls");
  
  const canvas = document.getElementById("canvas3d");
  if (!canvas) {
    console.error("Cannot add floating controls - canvas not found");
    return false;
  }
  
  // Create container for controls
  const controlsContainer = document.createElement('div');
  controlsContainer.classList.add('floating-controls');
  controlsContainer.style.cssText = `
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255,255,255,0.8);
    padding: 5px 10px;
    border-radius: 20px;
    display: flex;
    gap: 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10;
  `;
  
  // Add buttons
  controlsContainer.innerHTML = `
    <button id="floatingTranslate" title="Mode Translasi" onclick="setMouseMode3D('translate')" style="background: none; border: none; cursor: pointer; padding: 5px;">
      <svg style="width: 24px; height: 24px; fill: currentColor;">
        <use href="#move-icon"></use>
      </svg>
    </button>
    <button id="floatingRotate" title="Mode Rotasi" onclick="setMouseMode3D('rotate')" style="background: none; border: none; cursor: pointer; padding: 5px;">
      <svg style="width: 24px; height: 24px; fill: currentColor;">
        <use href="#rotate-icon"></use>
      </svg>
    </button>
  `;
  
  // Add to canvas container
  const canvasParent = canvas.parentElement;
  if (canvasParent) {
    canvasParent.style.position = 'relative';
    canvasParent.appendChild(controlsContainer);
    
    // Highlight active mode
    const translateBtn = document.getElementById('floatingTranslate');
    const rotateBtn = document.getElementById('floatingRotate');
    
    if (isTranslating) {
      translateBtn.style.color = '#0066cc';
      rotateBtn.style.color = '#333333';
    } else {
      rotateBtn.style.color = '#0066cc';
      translateBtn.style.color = '#333333';
    }
    
    return true;
  }
  
  return false;
}

// Update the setMouseMode3D function to work with any UI setup
window.setMouseMode3D = function(mode) {
  console.log("Setting 3D mouse mode to:", mode);
  
  // Determine if we need to toggle
  const shouldBeTranslating = (mode === 'translate');
  if (shouldBeTranslating !== isTranslating) {
    isTranslating = shouldBeTranslating;
    
    // Update cursor on canvas
    const canvas = document.getElementById("canvas3d");
    if (canvas) {
      canvas.style.cursor = isTranslating ? (isDragging ? "move" : "grab") : (isDragging ? "grabbing" : "default");
    }
    
    // Update mode button if it exists
    const toggleBtn = document.getElementById("toggleModeBtn");
    if (toggleBtn) {
      toggleBtn.innerHTML = isTranslating ? 
        `<svg class="icon"><use href="#move-icon"></use></svg> Mode: Translasi` :
        `<svg class="icon"><use href="#rotate-icon"></use></svg> Mode: Rotasi`;
    }
    
    // Update UI buttons - regular UI
    const translateButton = document.getElementById('translateMode3D');
    const rotateButton = document.getElementById('rotateMode3D');
    
    if (translateButton && rotateButton) {
      if (isTranslating) {
        translateButton.classList.add('active');
        rotateButton.classList.remove('active');
      } else {
        rotateButton.classList.add('active');
        translateButton.classList.remove('active');
      }
    }
    
    // Update floating UI if it exists
    const floatingTranslate = document.getElementById('floatingTranslate');
    const floatingRotate = document.getElementById('floatingRotate');
    
    if (floatingTranslate && floatingRotate) {
      if (isTranslating) {
        floatingTranslate.style.color = '#0066cc';
        floatingRotate.style.color = '#333333';
      } else {
        floatingRotate.style.color = '#0066cc';
        floatingTranslate.style.color = '#333333';
      }
    }
    
    console.log("3D mouse mode changed to:", isTranslating ? "Translasi" : "Rotasi");
  }
};

// Ensure both UI approaches are initialized on load
window.addEventListener('load', function() {
  // Delay initialization slightly to ensure DOM is fully loaded
  setTimeout(() => {
    // Check if scene is already initialized
    if (!scene || !renderer) {
      console.log("Reinitializing 3D scene...");
      window.init();
    }
    
    // Try regular controls first
    if (!addMouseControls3D()) {
      // Fallback to floating controls if regular ones fail
      console.log("Regular controls failed, adding floating controls");
      addFloatingMouseControls();
    }
  }, 1000);
});

// Explicitly make all functions available to the window object
window.createObject = createObject;
window.updateSize = updateSize;
window.resetAll = resetAll;
window.rotate3d = rotate3d;
window.translate3d = translate3d;
window.scale3d = scale3d;
window.resetTransform3d = resetTransform3d;
window.applyColor3d = applyColor3d;
window.toggleTranslationMode = toggleTranslationMode;

// Add a utility function to check the scene status
window.checkSceneStatus = function() {
  console.log("Checking 3D Scene Status:");
  console.log("- Scene initialized:", !!scene);
  console.log("- Camera initialized:", !!camera);
  console.log("- Renderer initialized:", !!renderer);
  console.log("- Object created:", !!object);
  
  if (object) {
    console.log("- Object type:", object.geometry.type);
    console.log("- Object position:", object.position);
    console.log("- Object visible:", object.visible);
    console.log("- Object in scene:", scene.children.includes(object));
  }
  
  if (renderer && scene && camera) {
    console.log("- Attempting to force render");
    renderer.render(scene, camera);
  }
  
  return {
    sceneReady: !!scene,
    cameraReady: !!camera,
    rendererReady: !!renderer,
    objectReady: !!object,
    objectDetails: object ? {
      type: object.geometry.type,
      position: object.position,
      visible: object.visible,
      inScene: scene.children.includes(object)
    } : null
  };
};

// Add a debug mode toggle
window.toggleDebugMode = function() {
  const isDebugMode = document.body.classList.toggle('debug-mode');
  
  if (isDebugMode && scene) {
    // Add helper elements when in debug mode
    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.userData.isHelper = true;
    scene.add(axesHelper);
    
    const gridHelper = new THREE.GridHelper(10, 10);
    gridHelper.userData.isHelper = true;
    scene.add(gridHelper);
    
    console.log("Debug mode activated - added helpers to scene");
  } else if (scene) {
    // Remove helpers when leaving debug mode
    scene.children.forEach(child => {
      if (child.userData && child.userData.isHelper) {
        scene.remove(child);
      }
    });
    console.log("Debug mode deactivated - removed helpers from scene");
  }
  
  return isDebugMode;
};

// Add an emergency reinitialize function
window.reinitialize3D = function() {
  console.log("Performing emergency 3D reinitialization");
  
  // Clean up existing resources
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  
  if (object) {
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
    object = null;
  }
  
  // Clear scene
  if (scene) {
    while(scene.children.length > 0) { 
      const child = scene.children[0];
      scene.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    scene = null;
  }
  
  camera = null;
  
  // Reinitialize everything
  console.log("Starting fresh initialization");
  init();
  
  // Create default object
  setTimeout(() => {
    createObject("cube");
  }, 100);
  
  return "Reinitialization complete";
};

// Modify existing init function to be more robust (add this at the beginning)
const originalInit = init;
window.init = function() {
  console.log("Starting 3D initialization with robust error handling");
  
  try {
    // Clear previous state if any
    if (renderer) {
      console.log("Disposing previous renderer");
      renderer.dispose();
    }
    
    if (object) {
      console.log("Disposing previous object");
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
    }
    
    if (scene) {
      console.log("Clearing previous scene");
      while(scene.children.length > 0) { 
        scene.remove(scene.children[0]);
      }
    }
    
    // Call original init with try/catch
    originalInit();
    
    // Set default active object type
    activeObjectType = "cube";
    
    // Extra verification
    if (!scene || !camera || !renderer) {
      throw new Error("Failed to initialize 3D components");
    }
    
    console.log("3D initialization completed successfully");
  } catch (error) {
    console.error("Critical error during 3D initialization:", error);
    if (typeof window.displayDetailedError === "function") {
      window.displayDetailedError(error.message, "script3d.js [window.init]", error.stack ? error.stack.split('\n')[1] : "");
    }
  }
};

// Function to update object selection UI
function updateObjectSelectionUI(type) {
  console.log(`Updating 3D object selection UI for: ${type}`);
  
  // Select buttons by their onclick attribute instead of ID
  const buttons = document.querySelectorAll('#controls3d .tool-section:first-child button');
  
  // Reset all button styles
  buttons.forEach(button => {
    button.classList.remove("active");
    button.style.backgroundColor = "";
    button.style.color = "";
  });
  
  // Find and highlight the selected button
  buttons.forEach(button => {
    // Extract object type from onclick attribute
    const onclickValue = button.getAttribute('onclick') || '';
    const match = onclickValue.match(/createObject\(['"]([^'"]+)['"]\)/);
    
    if (match && match[1] === type) {
      button.classList.add("active");
      // Apply direct styling to ensure the active state is visible
      button.style.backgroundColor = "var(--primary, #333)";
      button.style.color = "white";
    }
  });
}

// Add this function to add IDs to the buttons for easier selection
function addObjectButtonIds() {
  const buttonContainer = document.querySelector('#controls3d .tool-section:first-child');
  if (!buttonContainer) return;
  
  // Get all buttons in the first tool section of controls3d
  const buttons = buttonContainer.querySelectorAll('button');
  
  // Map of button texts to IDs
  const buttonMap = {
    'Kubus': 'cube3d',
    'Tabung': 'tabung3d',
    'Limas': 'limas3d'
  };
  
  // Assign IDs based on button text
  buttons.forEach(button => {
    const text = button.textContent.trim();
    if (buttonMap[text]) {
      button.id = buttonMap[text];
    }
  });
  
  console.log("Added IDs to 3D object buttons");
}

// Add this to the window.addEventListener('DOMContentLoaded') section
window.addEventListener('DOMContentLoaded', function() {
  // ...existing code...
  
  // Add IDs to the buttons and ensure the initial selection is highlighted
  setTimeout(() => {
    addObjectButtonIds();
    updateObjectSelectionUI(activeObjectType);
  }, 800);
});

// Also call updateObjectSelectionUI from window.onload to ensure UI matches state
const originalWindowOnload = window.onload;
window.onload = function() {
  if (typeof originalWindowOnload === 'function') {
    originalWindowOnload();
  }
  
  // Update the UI to match the active object type
  updateObjectSelectionUI(activeObjectType);
};

//# sourceMappingURL=script3d.js.map
