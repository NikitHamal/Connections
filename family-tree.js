// Family Tree Creator JavaScript

// Constants
const CANVAS_GRID_SIZE = 20;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 150;
const VERTICAL_SPACING = 100;
const HORIZONTAL_SPACING = 50;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

// Main Class
class FamilyTreeCreator {
    constructor() {
        this.initializeFirebase();
        this.setupEventListeners();
        this.setupCanvas();
        this.setupLayoutButtons();
        this.setupPersonDetailsPanel();
        this.setupDisplayOptions();
        this.setupMobileInteractions();
        this.currentTree = null;
        this.selectedNode = null;
        this.isDragging = false;
        this.currentTool = 'select';
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.updateZoomLevel();
        
        // Initialize infinite canvas
        this.canvasSize = {
            width: window.innerWidth * 4,
            height: window.innerHeight * 4
        };
        
        // Hide person details panel by default
        document.getElementById('person-details-panel').classList.remove('active');
    }

    // Firebase Setup
    initializeFirebase() {
        try {
            // Firebase services
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.storage = firebase.storage();
            
            // Auth state listener
            this.auth.onAuthStateChanged(user => {
                if (user) {
                    console.log('User logged in:', user.email);
                    // Get user's trees when logged in
                    this.loadUserTrees();
                } else {
                    console.log('User logged out');
                    // Check for local trees
                    const localTree = localStorage.getItem('currentTree');
                    if (localTree) {
                        this.currentTree = JSON.parse(localTree);
                        this.renderTree();
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            // Continue with limited functionality if Firebase fails
            this.showNotification('Some features may be limited due to connection issues', 'warning');
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // New tree button
        document.getElementById('new-tree-btn').addEventListener('click', () => this.createNewTree());
        
        // Load tree button
        document.getElementById('load-tree-btn').addEventListener('click', () => this.showLoadTreeModal());
        
        // Save tree button
        document.getElementById('save-tree-btn').addEventListener('click', () => this.saveTree());
        
        // Export tree button
        document.getElementById('export-tree-btn').addEventListener('click', () => this.showExportModal());
        
        // Share tree button
        document.getElementById('share-tree-btn').addEventListener('click', () => this.showShareModal());
        
        // Add person button
        document.getElementById('add-person-btn').addEventListener('click', () => this.showAddPersonModal());
        
        // Save person button
        document.getElementById('save-person').addEventListener('click', () => this.savePerson());
        
        // Cancel add person button
        document.getElementById('cancel-add-person').addEventListener('click', () => this.hideAddPersonModal());
        
        // Close modal buttons
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });
        
        // Photo upload
        document.getElementById('person-photo').addEventListener('change', (e) => this.handlePhotoUpload(e));
        
        // Enhance file input display
        const fileInput = document.getElementById('person-photo');
        const fileInputLabel = document.querySelector('.file-input-text');
        if (fileInput && fileInputLabel) {
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    fileInputLabel.textContent = fileInput.files[0].name;
                } else {
                    fileInputLabel.textContent = 'Choose a file';
                }
            });
        }

        // Add relationship buttons
        document.getElementById('add-parent-btn').addEventListener('click', () => this.addRelationshipField('parent'));
        document.getElementById('add-spouse-btn').addEventListener('click', () => this.addRelationshipField('spouse'));
        document.getElementById('add-child-btn').addEventListener('click', () => this.addRelationshipField('child'));
        
        // Layout selection
        document.getElementById('layout-type').addEventListener('change', (e) => {
            this.changeLayout(e.target.value);
        });
        
        // Theme selection
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.changeTheme(e.target.value);
        });
        
        // Canvas interaction
        this.canvas = document.getElementById('tree-canvas');
        this.canvas.addEventListener('mousedown', this.handleCanvasMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleCanvasMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleCanvasMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleCanvasWheel.bind(this));
        
        // Tool buttons
        document.getElementById('select-btn').addEventListener('click', () => this.setTool('select'));
        document.getElementById('pan-btn').addEventListener('click', () => this.setTool('pan'));
        
        // Zoom controls
        document.getElementById('zoom-in-btn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out-btn').addEventListener('click', () => this.zoomOut());
        document.getElementById('fit-screen-btn').addEventListener('click', () => this.fitToScreen());
        
        // Share actions
        document.getElementById('copy-link-btn')?.addEventListener('click', () => this.copyShareLink());
        document.getElementById('add-share-user')?.addEventListener('click', () => this.addSharedUser());
        
        // Window resize
        window.addEventListener('resize', () => this.updateCanvasSize());

        // Load user menu
        this.loadUserMenu();

        // Double click to center on node
        this.canvas.addEventListener('dblclick', (e) => {
            const node = e.target.closest('.person-node');
            if (node) {
                this.centerOnNode(node);
            }
        });

        // Add minimap toggle
        const minimapToggle = document.createElement('button');
        minimapToggle.className = 'tool-btn';
        minimapToggle.innerHTML = '<span class="material-symbols-rounded">map</span>';
        minimapToggle.addEventListener('click', () => this.toggleMinimap());
        document.querySelector('.tools-row').appendChild(minimapToggle);

        // Add quick navigation
        const quickNavToggle = document.createElement('button');
        quickNavToggle.className = 'tool-btn';
        quickNavToggle.innerHTML = '<span class="material-symbols-rounded">navigation</span>';
        quickNavToggle.addEventListener('click', () => this.showQuickNavigation());
        document.querySelector('.tools-row').appendChild(quickNavToggle);
    }

    // Canvas Setup and Management
    setupCanvas() {
        this.canvas = document.getElementById('tree-canvas');
        this.canvasContainer = document.querySelector('.tree-canvas-container');
        
        // Set initial transform values
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Set minimum and maximum zoom levels
        this.MIN_SCALE = 0.1;
        this.MAX_SCALE = 5;
        
        // Set initial canvas size
        this.updateCanvasSize();
        
        // Initialize pan and zoom state
        this.isPanning = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // Add event listeners for pan and zoom
        this.canvasContainer.addEventListener('mousedown', this.handleCanvasMouseDown.bind(this));
        this.canvasContainer.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
        this.canvasContainer.addEventListener('mouseup', this.handleCanvasMouseUp.bind(this));
        this.canvasContainer.addEventListener('mouseleave', this.handleCanvasMouseUp.bind(this));
        this.canvasContainer.addEventListener('wheel', this.handleCanvasWheel.bind(this));
    }

    updateCanvasSize() {
        // Make canvas size much larger than viewport to allow for large trees
        this.canvas.style.width = '5000px';
        this.canvas.style.height = '5000px';
        this.canvas.style.transformOrigin = '0 0';
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        
        // Ensure container has proper styling
        this.canvasContainer.style.position = 'relative';
        this.canvasContainer.style.overflow = 'hidden';
    }

    handleCanvasMouseDown(e) {
        if (e.button !== 0) return; // Only handle left mouse button
        
        this.isPanning = this.currentTool === 'pan';
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        
        // Prevent text selection while panning
        if (this.isPanning) {
            e.preventDefault();
            this.canvasContainer.style.cursor = 'grabbing';
        }
    }

    handleCanvasMouseMove(e) {
        if (!this.isPanning) return;
        
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        
        this.offsetX += dx;
        this.offsetY += dy;
        
        this.updateCanvasTransform();
        
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }

    handleCanvasMouseUp() {
        this.isPanning = false;
        this.canvasContainer.style.cursor = this.currentTool === 'pan' ? 'grab' : 'default';
    }

    handleCanvasWheel(e) {
        e.preventDefault();
        
        const rect = this.canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom
        const delta = -Math.sign(e.deltaY) * 0.1;
        const newScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, this.scale * (1 + delta)));
        
        if (newScale !== this.scale) {
            // Calculate new offsets to zoom towards mouse position
            const scaleChange = newScale / this.scale;
            
            // Adjust offset to zoom into mouse position
            this.offsetX -= (mouseX - this.offsetX) * (scaleChange - 1);
            this.offsetY -= (mouseY - this.offsetY) * (scaleChange - 1);
            
            this.scale = newScale;
            this.updateCanvasTransform();
            this.updateZoomLevel();
        }
    }

    updateCanvasTransform() {
        requestAnimationFrame(() => {
            this.canvas.style.transform = `matrix(${this.scale}, 0, 0, ${this.scale}, ${this.offsetX}, ${this.offsetY})`;
        });
    }

    // Tree Management
    async createNewTree() {
        try {
            const name = document.getElementById('tree-name').value || 'My Family Tree';
            const description = document.getElementById('tree-description').value || 'A family tree';
            const privacy = document.getElementById('tree-privacy').value || 'private';
            
            // Create new tree structure
            this.currentTree = {
                id: 'tree_' + Date.now(),
                name: name,
                description: description,
                privacy: privacy,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                nodes: [],
                layout: 'vertical',
                theme: 'classic'
            };
            
            // Check if user is logged in
            const user = this.auth.currentUser;
            if (user) {
                // Save to database
                await this.db.collection('trees').doc(this.currentTree.id).set({
                    ...this.currentTree,
                    owner: user.uid
                });
                
                this.showNotification('New tree created', 'success');
            } else {
                // Store in local storage if not logged in
                localStorage.setItem('currentTree', JSON.stringify(this.currentTree));
                this.showNotification('New tree created (local only)', 'info');
            }
            
            // Reset canvas
            this.clearCanvas();
            this.showEmptyState();
            
            return this.currentTree;
        } catch (error) {
            console.error('Error creating tree:', error);
            this.showNotification('Failed to create new tree', 'error');
            throw error;
        }
    }

    async loadTree(treeId) {
        try {
            // Show loading state
            this.showNotification('Loading tree...', 'info');
            
            // Get tree from database
            const docRef = this.db.collection('trees').doc(treeId);
            const doc = await docRef.get();
            
            if (!doc.exists) {
                throw new Error('Tree not found');
            }
            
            // Set as current tree
            this.currentTree = {
                id: doc.id,
                ...doc.data()
            };
            
            // Ensure nodes array exists
            if (!this.currentTree.nodes) {
                this.currentTree.nodes = [];
            }
            
            // Close modal if open
            const modal = document.getElementById('load-tree-modal');
            if (modal.classList.contains('active')) {
                this.closeModal(modal);
            }
            
            // Render tree
            this.renderTree();
            this.showNotification('Tree loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading tree:', error);
            this.showNotification('Failed to load tree: ' + error.message, 'error');
        }
    }

    async saveTree() {
        try {
            if (!this.currentTree) {
                throw new Error('No active tree to save');
            }
            
            // Show saving state
            this.showNotification('Saving tree...', 'info');
            
            // Update timestamps
            this.currentTree.updated = new Date().toISOString();
            
            const user = this.auth.currentUser;
            if (!user) {
                // Save to local storage if not logged in
                localStorage.setItem('currentTree', JSON.stringify(this.currentTree));
                this.showNotification('Tree saved to local storage', 'success');
            return;
        }

            // Save to database
            await this.db.collection('trees').doc(this.currentTree.id).set({
                ...this.currentTree,
                owner: user.uid
            });
            
            this.showNotification('Tree saved successfully', 'success');
        } catch (error) {
            console.error('Error saving tree:', error);
            this.showNotification('Failed to save tree: ' + error.message, 'error');
        }
    }

    // Person Management
    async savePerson() {
        const form = document.getElementById('add-person-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        try {
            // Check if a tree exists
            if (!this.currentTree) {
                // Create a new tree if needed
                await this.createNewTree();
            }

            if (!this.currentTree || !this.currentTree.nodes) {
                throw new Error('Unable to create or access tree structure');
            }

            // Check if person already exists
            const firstName = document.getElementById('person-first-name').value;
            const lastName = document.getElementById('person-last-name').value;
            const existingPerson = this.currentTree.nodes.find(node => 
                node.firstName.toLowerCase() === firstName.toLowerCase() && 
                node.lastName.toLowerCase() === lastName.toLowerCase()
            );

            if (existingPerson) {
                // Update existing person
                existingPerson.middleName = document.getElementById('person-middle-name').value;
                existingPerson.maidenName = document.getElementById('person-maiden-name').value;
                existingPerson.gender = document.getElementById('person-gender').value;
                existingPerson.birthDate = document.getElementById('person-birth-date').value;
                existingPerson.birthLocation = document.getElementById('person-birth-location').value;
                existingPerson.deathDate = document.getElementById('person-death-date').value;
                existingPerson.deathLocation = document.getElementById('person-death-location').value;
                existingPerson.notes = document.getElementById('person-notes').value;
                
                // Update photo if new one is uploaded
                if (this.currentPhotoUrl) {
                    existingPerson.photoUrl = this.currentPhotoUrl;
                    this.currentPhotoUrl = null;
                }
                
                // Update relationships
                existingPerson.relationships = this.collectRelationshipData();
                this.updateRelationships(existingPerson);
                
                this.showNotification('Person updated successfully', 'success');
            } else {
                // Create new person
                const personData = {
                    id: Date.now().toString(),
                    firstName: firstName,
                    middleName: document.getElementById('person-middle-name').value,
                    lastName: lastName,
                    maidenName: document.getElementById('person-maiden-name').value,
                    gender: document.getElementById('person-gender').value,
                    birthDate: document.getElementById('person-birth-date').value,
                    birthLocation: document.getElementById('person-birth-location').value,
                    deathDate: document.getElementById('person-death-date').value,
                    deathLocation: document.getElementById('person-death-location').value,
                    notes: document.getElementById('person-notes').value,
                    relationships: this.collectRelationshipData(),
                    position: this.calculateNewNodePosition()
                };

                if (this.currentPhotoUrl) {
                    personData.photoUrl = this.currentPhotoUrl;
                    this.currentPhotoUrl = null;
                }

                this.currentTree.nodes.push(personData);
                this.updateRelationships(personData);
                this.showNotification('Person added successfully', 'success');
            }

            this.renderTree();
            this.hideAddPersonModal();
            await this.saveTree();
        } catch (error) {
            console.error('Error saving person:', error);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    // Update the uploadPhoto method to use ImageBB instead of Firebase Storage
    async uploadPhoto(file, personId) {
        // This method is kept for compatibility but is no longer used directly
        // Photo upload is now handled by handlePhotoUpload using ImageBB
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('https://api.imgbb.com/1/upload?key=cae25a5efbe778e17c1db8b6f4e44cd7', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                return data.data.url;
            } else {
                throw new Error('Failed to upload photo');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            throw error; // Re-throw to handle in the caller
        }
    }

    // Relationship Management
    collectRelationshipData() {
        const relationships = [];
        const container = document.getElementById('relationships-container');
        container.querySelectorAll('.relationship-item').forEach(item => {
            relationships.push({
                type: item.dataset.type,
                personId: item.querySelector('select').value,
                details: item.querySelector('input[type="text"]')?.value || ''
            });
        });
        return relationships;
    }

    updateRelationships(person) {
        if (!person || !person.relationships || !Array.isArray(person.relationships)) {
            return;
        }
        
        if (!this.currentTree || !this.currentTree.nodes || !Array.isArray(this.currentTree.nodes)) {
            return;
        }
        
        person.relationships.forEach(rel => {
            if (!rel.personId || !rel.type) return;
            
            const targetPerson = this.currentTree.nodes.find(node => node.id === rel.personId);
            if (!targetPerson) return;
            
            if (!targetPerson.relationships) {
                targetPerson.relationships = [];
            }
            
            // Check if we need to add a reciprocal relationship
            const needsReciprocal = !targetPerson.relationships.some(targetRel => 
                targetRel.personId === person.id && 
                this.isReciprocalRelationship(targetRel.type, rel.type)
            );
            
            if (needsReciprocal) {
                const reciprocalType = this.getReciprocalRelationshipType(rel.type);
                if (reciprocalType) {
                    // Remove any existing relationships of this type
                    targetPerson.relationships = targetPerson.relationships.filter(targetRel => 
                        targetRel.personId !== person.id || 
                        !this.isReciprocalRelationship(targetRel.type, rel.type)
                    );
                    
                    // Add the new reciprocal relationship
                    targetPerson.relationships.push({
                        personId: person.id,
                        type: reciprocalType,
                        details: rel.details
                    });
                }
            }
        });
        
        // Update spouse relationships
        if (person.relationships.some(rel => rel.type === 'spouse')) {
            person.relationships.forEach(rel => {
                if (rel.type === 'spouse') {
                    const spouse = this.currentTree.nodes.find(node => node.id === rel.personId);
                    if (spouse) {
                        // Ensure spouse has this person as spouse
                        if (!spouse.relationships) {
                            spouse.relationships = [];
                        }
                        if (!spouse.relationships.some(sRel => sRel.type === 'spouse' && sRel.personId === person.id)) {
                            spouse.relationships.push({
                                type: 'spouse',
                                personId: person.id,
                                details: rel.details
                            });
                        }
                    }
                }
            });
        }
    }
    
    isReciprocalRelationship(type1, type2) {
        const pairs = [
            ['parent', 'child'],
            ['spouse', 'spouse'],
            ['sibling', 'sibling'],
            ['cousin', 'cousin']
        ];
        
        return pairs.some(pair => 
            (pair[0] === type1 && pair[1] === type2) || 
            (pair[0] === type2 && pair[1] === type1)
        );
    }
    
    getReciprocalRelationshipType(type) {
        switch (type) {
            case 'parent': return 'child';
            case 'child': return 'parent';
            case 'spouse': return 'spouse';
            case 'sibling': return 'sibling';
            case 'cousin': return 'cousin';
            default: return null;
        }
    }

    // Rendering
    renderTree() {
        try {
            const canvas = document.getElementById('tree-canvas');
            
            // Clear canvas first
            while (canvas.firstChild) {
                canvas.removeChild(canvas.firstChild);
            }
            
            // If no tree or no nodes, show empty state
            if (!this.currentTree || !this.currentTree.nodes || this.currentTree.nodes.length === 0) {
                this.showEmptyState();
                return;
            }
            
            // Get the layout type and render accordingly
            const layoutType = this.currentTree.layout || 'vertical';
            
            switch (layoutType) {
                case 'horizontal':
                    this.renderHorizontalLayout();
                    break;
                case 'radial':
                    this.renderRadialLayout();
                    break;
                case 'vertical':
                default:
                    this.renderVerticalLayout();
                    break;
            }
            
            // Render relationships after nodes
            this.renderRelationshipLines();
        } catch (error) {
            console.error('Error rendering tree:', error);
            this.showNotification('Error rendering tree: ' + error.message, 'error');
            this.showEmptyState();
        }
    }

    renderVerticalLayout() {
        // Find root nodes (oldest generation)
        const rootNodes = this.findRootNodes();
        
        // Sort root nodes by birth date
        rootNodes.sort((a, b) => this.compareBirthDates(a, b));
        
        let currentY = 50;
        let maxY = currentY;
        
        // Keep track of rendered nodes to prevent duplicates
        const renderedNodes = new Set();
        
        const processLevel = (nodes, level, parentX = null) => {
            if (!nodes.length) return;
            
            // Sort siblings by birth date
            nodes.sort((a, b) => this.compareBirthDates(a, b));
            
            const levelWidth = this.calculateLevelWidth(nodes);
            let startX = parentX !== null ? 
                parentX - levelWidth / 2 + NODE_WIDTH / 2 : 
                (this.canvas.clientWidth - levelWidth) / 2;
            
            nodes.forEach(node => {
                // Skip if node has already been rendered
                if (renderedNodes.has(node.id)) return;
                
                // Find spouse if any
                const spouse = this.findSpouse(node.id);
                
                // Calculate node position
                const nodeX = startX;
                this.renderPersonNode(node, nodeX, currentY);
                renderedNodes.add(node.id);
                
                // Position spouse next to the person if exists
                if (spouse && !renderedNodes.has(spouse.id)) {
                    this.renderPersonNode(spouse, nodeX + NODE_WIDTH + HORIZONTAL_SPACING, currentY);
                    renderedNodes.add(spouse.id);
                    startX += (NODE_WIDTH + HORIZONTAL_SPACING) * 2;
                } else {
                    startX += NODE_WIDTH + HORIZONTAL_SPACING;
                }
                
                // Process children
                const children = this.findChildren(node.id);
                if (spouse) {
                    // Add spouse's children if any
                    const spouseChildren = this.findChildren(spouse.id);
                    children.push(...spouseChildren);
                }
                
                // Remove duplicates and sort by birth date
                const uniqueChildren = Array.from(new Set(children.map(child => child.id)))
                    .map(id => children.find(child => child.id === id))
                    .filter(child => !renderedNodes.has(child.id))
                    .sort((a, b) => this.compareBirthDates(a, b));
                
                if (uniqueChildren.length > 0) {
                    const nextY = currentY + NODE_HEIGHT + VERTICAL_SPACING;
                    maxY = Math.max(maxY, nextY);
                    const parentCenterX = nodeX + (spouse ? NODE_WIDTH + HORIZONTAL_SPACING : 0);
                    processLevel(uniqueChildren, level + 1, parentCenterX);
                }
            });
            
            currentY = maxY;
        };
        
        processLevel(rootNodes, 0);
    }

    calculateLevelWidth(nodes) {
        let width = 0;
        nodes.forEach(node => {
            width += NODE_WIDTH;
            const spouse = this.findSpouse(node.id);
            if (spouse) {
                width += NODE_WIDTH + HORIZONTAL_SPACING;
            }
            width += HORIZONTAL_SPACING;
        });
        return width - HORIZONTAL_SPACING; // Remove last spacing
    }

    compareBirthDates(a, b) {
        if (!a || !b) return 0;
        
        const dateA = a.birthDate ? new Date(a.birthDate) : new Date(0);
        const dateB = b.birthDate ? new Date(b.birthDate) : new Date(0);
        
        return dateA - dateB;
    }

    findSpouse(personId) {
        if (!this.currentTree || !this.currentTree.nodes) return null;
        
        const person = this.currentTree.nodes.find(node => node.id === personId);
        if (!person || !person.relationships) return null;
        
        // Find spouse relationship
        const spouseRel = person.relationships.find(rel => rel.type === 'spouse');
        if (!spouseRel) return null;
        
        return this.currentTree.nodes.find(node => node.id === spouseRel.personId);
    }

    findChildren(parentId) {
        if (!this.currentTree || !this.currentTree.nodes) return [];
        
        const parent = this.currentTree.nodes.find(node => node.id === parentId);
        if (!parent || !parent.relationships) return [];
        
        // Get all children IDs from parent's relationships
        const childrenIds = parent.relationships
            .filter(rel => rel.type === 'child')
            .map(rel => rel.personId);
        
        // Also check for inverse relationships (where children list this person as parent)
        this.currentTree.nodes.forEach(node => {
            if (node.relationships) {
                node.relationships.forEach(rel => {
                    if (rel.type === 'parent' && rel.personId === parentId) {
                        childrenIds.push(node.id);
                    }
                });
            }
        });
        
        // Remove duplicates and return actual child nodes
        return Array.from(new Set(childrenIds))
            .map(id => this.currentTree.nodes.find(node => node.id === id))
            .filter(Boolean); // Remove any undefined entries
    }

    renderHorizontalLayout() {
        // Find root nodes (oldest generation)
        const rootNodes = this.findRootNodes();
        
        // Sort root nodes by birth date
        rootNodes.sort((a, b) => this.compareBirthDates(a, b));
        
        let currentX = 50;
        let maxX = currentX;
        
        // Keep track of rendered nodes to prevent duplicates
        const renderedNodes = new Set();
        
        const processLevel = (nodes, level, parentY = null) => {
            if (!nodes.length) return;
            
            // Sort siblings by birth date
            nodes.sort((a, b) => this.compareBirthDates(a, b));
            
            const levelHeight = this.calculateLevelHeight(nodes);
            let startY = parentY !== null ? 
                parentY - levelHeight / 2 + NODE_HEIGHT / 2 : 
                (this.canvas.clientHeight - levelHeight) / 2;
            
            nodes.forEach(node => {
                // Skip if node has already been rendered
                if (renderedNodes.has(node.id)) return;
                
                // Find spouse if any
                const spouse = this.findSpouse(node.id);
                
                // Calculate node position
                const nodeY = startY;
                this.renderPersonNode(node, currentX, nodeY);
                renderedNodes.add(node.id);
                
                // Position spouse next to the person if exists
                if (spouse && !renderedNodes.has(spouse.id)) {
                    this.renderPersonNode(spouse, currentX, nodeY + NODE_HEIGHT + VERTICAL_SPACING);
                    renderedNodes.add(spouse.id);
                    startY += (NODE_HEIGHT + VERTICAL_SPACING) * 2;
                } else {
                    startY += NODE_HEIGHT + VERTICAL_SPACING;
                }
                
                // Process children
                const children = this.findChildren(node.id);
                if (spouse) {
                    // Add spouse's children if any
                    const spouseChildren = this.findChildren(spouse.id);
                    children.push(...spouseChildren);
                }
                
                // Remove duplicates and sort by birth date
                const uniqueChildren = Array.from(new Set(children.map(child => child.id)))
                    .map(id => children.find(child => child.id === id))
                    .filter(child => !renderedNodes.has(child.id))
                    .sort((a, b) => this.compareBirthDates(a, b));
                
                if (uniqueChildren.length > 0) {
                    const nextX = currentX + NODE_WIDTH + HORIZONTAL_SPACING;
                    maxX = Math.max(maxX, nextX);
                    const parentCenterY = nodeY + (spouse ? NODE_HEIGHT + VERTICAL_SPACING : 0);
                    processLevel(uniqueChildren, level + 1, parentCenterY);
                }
            });
            
            currentX = maxX;
        };
        
        processLevel(rootNodes, 0);
    }

    calculateLevelHeight(nodes) {
        let height = 0;
        nodes.forEach(node => {
            height += NODE_HEIGHT;
            const spouse = this.findSpouse(node.id);
            if (spouse) {
                height += NODE_HEIGHT + VERTICAL_SPACING;
            }
            height += VERTICAL_SPACING;
        });
        return height - VERTICAL_SPACING; // Remove last spacing
    }

    renderRadialLayout() {
        // Implementation for radial layout
        const rootNodes = this.findRootNodes();
        const centerX = this.canvas.clientWidth / 2;
        const centerY = this.canvas.clientHeight / 2;
        const radius = Math.min(centerX, centerY) - NODE_HEIGHT;
        
        const processLevel = (nodes, level, startAngle, endAngle) => {
            const angleStep = (endAngle - startAngle) / nodes.length;
            
            nodes.forEach((node, index) => {
                const angle = startAngle + (index + 0.5) * angleStep;
                const x = centerX + radius * Math.cos(angle) - NODE_WIDTH / 2;
                const y = centerY + radius * Math.sin(angle) - NODE_HEIGHT / 2;
                
                this.renderPersonNode(node, x, y);
                
                const children = this.findChildren(node.id);
                if (children.length) {
                    const nextRadius = radius * 1.5;
                    processLevel(children, level + 1, angle - angleStep/2, angle + angleStep/2);
                }
            });
        };
        
        processLevel(rootNodes, 0, 0, 2 * Math.PI);
    }

    renderPersonNode(person, x, y) {
        const node = document.createElement('div');
        node.className = `person-node ${person.gender}`;
        node.id = `person-${person.id}`;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        
        // Photo or placeholder
        if (person.photoUrl && document.getElementById('show-photos').checked) {
            const photo = document.createElement('img');
            photo.src = person.photoUrl;
            photo.className = 'person-photo';
            node.appendChild(photo);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'person-photo-placeholder';
            placeholder.innerHTML = '<span class="material-symbols-rounded">person</span>';
            node.appendChild(placeholder);
        }
        
        // Name
        const name = document.createElement('div');
        name.className = 'person-name';
        name.textContent = `${person.firstName} ${person.lastName}`;
        node.appendChild(name);
        
        // Dates
        if (document.getElementById('show-dates').checked && (person.birthDate || person.deathDate)) {
            const dates = document.createElement('div');
            dates.className = 'person-dates';
            dates.textContent = `${person.birthDate || '?'} - ${person.deathDate || 'Present'}`;
            node.appendChild(dates);
        }
        
        // Location
        if (document.getElementById('show-locations').checked && person.birthLocation) {
            const location = document.createElement('div');
            location.className = 'person-location';
            location.textContent = person.birthLocation;
            node.appendChild(location);
        }
        
        node.addEventListener('click', () => this.selectPerson(person));
        this.canvas.appendChild(node);
    }

    renderRelationshipLines() {
        if (!document.getElementById('show-relationships').checked) return;
        if (!this.currentTree || !this.currentTree.nodes) return;
        
        const canvas = document.getElementById('tree-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        this.currentTree.nodes.forEach(person => {
            if (!person.relationships) return;
            
            const fromNode = document.getElementById(`person-${person.id}`);
            if (!fromNode) return;
            
            person.relationships.forEach(rel => {
                const toNode = document.getElementById(`person-${rel.personId}`);
                if (!toNode) return;
                
                // Create relationship line with icon
                const line = document.createElement('div');
                line.className = `relationship-line ${rel.type}`;
                
                const fromRect = fromNode.getBoundingClientRect();
                const toRect = toNode.getBoundingClientRect();
                
                const position = this.calculateLinePosition(fromRect, toRect, rel.type);
                
                // Set line position and dimensions
                line.style.left = `${position.left - canvasRect.left}px`;
                line.style.top = `${position.top - canvasRect.top}px`;
                line.style.width = `${position.width}px`;
                line.style.height = `${position.height}px`;
                line.style.transform = `rotate(${position.angle}deg)`;
                
                // Add icon container
                const icon = document.createElement('div');
                icon.className = 'relationship-icon';
                line.appendChild(icon);
                
                canvas.appendChild(line);
            });
        });
    }

    calculateLinePosition(fromRect, toRect, type) {
        const fromCenterX = fromRect.left + fromRect.width / 2;
        const fromCenterY = fromRect.top + fromRect.height / 2;
        const toCenterX = toRect.left + toRect.width / 2;
        const toCenterY = toRect.top + toRect.height / 2;
        
        switch (type) {
            case 'spouse': {
                const left = Math.min(fromRect.right, toRect.left);
                const width = Math.abs(fromRect.right - toRect.left);
                return {
                    left: left,
                    top: fromCenterY,
                    width: width,
                    height: 2,
                    angle: 0
                };
            }
            
            case 'parent':
            case 'child': {
                const top = Math.min(fromRect.bottom, toRect.top);
                const height = Math.abs(fromRect.bottom - toRect.top);
                return {
                    left: fromCenterX,
                    top: top,
                    width: 2,
                    height: height,
                    angle: 0
                };
            }
            
            case 'sibling':
            case 'cousin': {
                const dx = toCenterX - fromCenterX;
                const dy = toCenterY - fromCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                
                return {
                    left: fromCenterX,
                    top: fromCenterY,
                    width: distance,
                    height: 2,
                    angle: angle
                };
            }
            
            default:
                return {
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                    angle: 0
                };
        }
    }

    // Utility Functions
    findRootNodes() {
        if (!this.currentTree || !this.currentTree.nodes || !Array.isArray(this.currentTree.nodes)) {
            return [];
        }
        
        return this.currentTree.nodes.filter(node => {
            // Check if this person is not a child in any other person's relationships
            return !this.currentTree.nodes.some(otherNode => {
                if (!otherNode.relationships || !Array.isArray(otherNode.relationships)) {
                    return false;
                }
                return otherNode.relationships.some(rel => 
                    rel.type === 'child' && rel.personId === node.id
                );
            });
        });
    }

    calculateNewNodePosition() {
        // Calculate position for new node based on selected node or default position
        if (this.selectedNode) {
            const selectedRect = document.getElementById(`person-${this.selectedNode.id}`).getBoundingClientRect();
            return {
                x: selectedRect.left + NODE_WIDTH + HORIZONTAL_SPACING,
                y: selectedRect.top
            };
        }
        return {
            x: (this.canvas.clientWidth - NODE_WIDTH) / 2,
            y: (this.canvas.clientHeight - NODE_HEIGHT) / 2
        };
    }

    // UI Helpers
    showNotification(message, type) {
        // Implementation for showing notifications
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    showEmptyState() {
        const canvas = document.getElementById('tree-canvas');
        
        // Clear canvas first
        while (canvas.firstChild) {
            canvas.removeChild(canvas.firstChild);
        }
        
        // Add empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <span class="material-symbols-rounded">family_history</span>
            <h3>Your family tree will appear here</h3>
            <p>Start by adding a person or loading an existing tree</p>
        `;
        
        canvas.appendChild(emptyState);
    }

    // Event Handlers
    handleCanvasMouseDown(e) {
        if (e.button !== 0) return; // Only handle left mouse button
        
        this.isPanning = this.currentTool === 'pan';
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        
        // Prevent text selection while panning
        if (this.isPanning) {
            e.preventDefault();
            this.canvasContainer.style.cursor = 'grabbing';
        }
    }

    handleCanvasMouseMove(e) {
        if (!this.isPanning) return;
        
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        
        this.offsetX += dx;
        this.offsetY += dy;
        
        this.updateCanvasTransform();
        
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }

    handleCanvasMouseUp() {
        this.isPanning = false;
        this.canvasContainer.style.cursor = this.currentTool === 'pan' ? 'grab' : 'default';
    }

    handleCanvasWheel(e) {
        e.preventDefault();
        
        const rect = this.canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom
        const delta = -Math.sign(e.deltaY) * 0.1;
        const newScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, this.scale * (1 + delta)));
        
        if (newScale !== this.scale) {
            // Calculate new offsets to zoom towards mouse position
            const scaleChange = newScale / this.scale;
            
            // Adjust offset to zoom into mouse position
            this.offsetX -= (mouseX - this.offsetX) * (scaleChange - 1);
            this.offsetY -= (mouseY - this.offsetY) * (scaleChange - 1);
            
            this.scale = newScale;
            this.updateCanvasTransform();
            this.updateZoomLevel();
        }
    }

    updateZoomLevel() {
        const zoomLevel = document.querySelector('.zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
        }
    }

    // Modal Management
    showLoadTreeModal() {
        const modal = document.getElementById('load-tree-modal');
        modal.classList.add('active');
        this.loadUserTrees();
    }

    showAddPersonModal() {
        const modal = document.getElementById('add-person-modal');
        modal.classList.add('active');
        this.resetAddPersonForm();
    }

    showShareModal() {
        const modal = document.getElementById('share-tree-modal');
        modal.classList.add('active');
        this.updateShareLink();
    }

    showExportModal() {
        const modal = document.getElementById('export-tree-modal');
        modal.classList.add('active');
    }

    hideAddPersonModal() {
        const modal = document.getElementById('add-person-modal');
        modal.classList.remove('active');
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // UI/UX Improvements
    async loadUserTrees() {
        try {
            const treesList = document.getElementById('trees-list');
            treesList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your trees...</p></div>';
            
            // Check if user is logged in
            const user = this.auth.currentUser;
            if (!user) {
                treesList.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">account_circle</span><p>Please sign in to load your trees</p></div>';
                return;
            }
            
            // Get trees for this user - using a simple query without ordering
            const treesRef = this.db.collection('trees');
            const snapshot = await treesRef.where('owner', '==', user.uid).get();
            
            if (snapshot.empty) {
                treesList.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">forest</span><p>You don\'t have any trees yet</p></div>';
                return;
            }
            
            // Clear loading state and prepare to show trees
            treesList.innerHTML = '';
            
            // Convert to array of data and sort client-side
            let trees = [];
            snapshot.forEach(doc => {
                trees.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Sort by updated date (client-side sorting)
            trees.sort((a, b) => {
                const dateA = a.updated ? new Date(a.updated) : new Date(0);
                const dateB = b.updated ? new Date(b.updated) : new Date(0);
                return dateB - dateA; // Most recent first
            });
            
            // Display trees
            trees.forEach(tree => {
                const treeItem = document.createElement('div');
                treeItem.className = 'tree-item';
                treeItem.dataset.id = tree.id;
                
                const lastUpdated = tree.updated 
                    ? new Date(tree.updated).toLocaleDateString() 
                    : 'Never updated';
                
                treeItem.innerHTML = `
                    <div class="tree-item-header">
                        <h4 class="tree-item-title">${tree.name || 'Unnamed Tree'}</h4>
                        <span class="tree-item-date">${lastUpdated}</span>
                    </div>
                    <p class="tree-item-description">${tree.description || 'No description'}</p>
                    <div class="tree-item-meta">
                        <span class="tree-item-meta-item">
                            <span class="material-symbols-rounded">person</span>
                            ${tree.nodes ? tree.nodes.length : 0} people
                        </span>
                        <span class="tree-item-meta-item">
                            <span class="material-symbols-rounded">visibility</span>
                            ${tree.privacy || 'Private'}
                        </span>
                    </div>
                `;
                
                treeItem.addEventListener('click', () => this.loadTree(tree.id));
                treesList.appendChild(treeItem);
            });
        } catch (error) {
            console.error('Error loading trees:', error);
            const treesList = document.getElementById('trees-list');
            treesList.innerHTML = `
                <div class="error-state">
                    <span class="material-symbols-rounded">error</span>
                    <p>Error loading trees. Please try again later.</p>
                </div>
            `;
        }
    }

    resetAddPersonForm() {
        const form = document.getElementById('add-person-form');
        form.reset();
        document.getElementById('photo-preview').innerHTML = '';
        document.getElementById('relationships-container').innerHTML = '';
    }

    async handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const preview = document.getElementById('photo-preview');
        
        // Show loading state
        preview.innerHTML = '<div class="spinner"></div>';

        try {
            // Validate file type and size
            if (!file.type.startsWith('image/')) {
                throw new Error('Please upload an image file');
            }
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Image size should be less than 5MB');
            }

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);

            // Upload to ImageBB
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('https://api.imgbb.com/1/upload?key=cae25a5efbe778e17c1db8b6f4e44cd7', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                // Store the URL for later use
                this.currentPhotoUrl = data.data.url;
                this.showNotification('Photo uploaded successfully', 'success');
            } else {
                throw new Error('Failed to upload photo');
            }
        } catch (error) {
            preview.innerHTML = '';
            this.showNotification(error.message, 'error');
        }
    }

    addRelationshipField(type) {
        const container = document.getElementById('relationships-container');
        const relationshipItem = document.createElement('div');
        relationshipItem.className = 'relationship-item';
        relationshipItem.dataset.type = type;

        // Get available people for relationship
        const availablePeople = this.currentTree?.nodes || [];
        const options = availablePeople.map(person => 
            `<option value="${person.id}">${person.firstName} ${person.lastName}</option>`
        ).join('');

        relationshipItem.innerHTML = `
            <div class="relationship-item-header">
                <span class="relationship-type">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <button type="button" class="remove-relationship">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <select required>
                        <option value="">Select a person</option>
                        ${options}
                    </select>
                </div>
                <div class="form-group">
                    <input type="text" placeholder="Relationship details (optional)">
                </div>
            </div>
        `;

        // Add remove button functionality
        relationshipItem.querySelector('.remove-relationship').addEventListener('click', () => {
            relationshipItem.remove();
        });

        container.appendChild(relationshipItem);
    }

    updateShareLink() {
        if (!this.currentTree?.id) return;
        
        const shareLink = document.getElementById('share-link');
        shareLink.value = `${window.location.origin}/view-tree.html?id=${this.currentTree.id}`;
    }

    async copyShareLink() {
        const shareLink = document.getElementById('share-link');
        try {
            await navigator.clipboard.writeText(shareLink.value);
            this.showNotification('Link copied to clipboard', 'success');
        } catch (error) {
            this.showNotification('Failed to copy link', 'error');
        }
    }

    async addSharedUser() {
        const emailInput = document.getElementById('share-with-users');
        const email = emailInput.value.trim();
        
        if (!email || !email.includes('@')) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        const sharedUsersList = document.getElementById('shared-users-list');
        const userItem = document.createElement('div');
        userItem.className = 'shared-user-item';
        userItem.innerHTML = `
            <span class="shared-user-email">${email}</span>
            <button class="remove-shared-user">
                <span class="material-symbols-rounded">close</span>
            </button>
        `;

        userItem.querySelector('.remove-shared-user').addEventListener('click', () => {
            userItem.remove();
        });

        sharedUsersList.appendChild(userItem);
        emailInput.value = '';
    }

    // Tool Management
    setTool(tool) {
        this.currentTool = tool;
        this.canvasContainer.style.cursor = tool === 'pan' ? 'grab' : 'default';
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            if (btn.id === `${tool}-btn`) {
                btn.classList.add('active');
            } else if (btn.id && btn.id.endsWith('-btn')) {
                btn.classList.remove('active');
            }
        });
    }

    zoomIn() {
        this.scale = Math.min(2, this.scale * 1.2);
        this.updateCanvasTransform();
        this.updateZoomLevel();
    }

    zoomOut() {
        this.scale = Math.max(0.5, this.scale * 0.8);
        this.updateCanvasTransform();
        this.updateZoomLevel();
    }

    fitToScreen() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.updateCanvasTransform();
        this.updateZoomLevel();
    }

    // Theme Management
    changeTheme(theme) {
        document.body.className = theme;
        localStorage.setItem('familyTreeTheme', theme);
    }

    // Utility Functions
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    selectPerson(person) {
        const panel = document.getElementById('person-details-panel');
        const isMobile = window.innerWidth <= 768;

        if (this.selectedNode?.id === person.id && panel.classList.contains('active')) {
            // If clicking the same person, close the panel
            panel.classList.remove('active');
            this.selectedNode = null;
        } else {
            // If clicking a different person or panel is closed
            this.selectedNode = person;
            panel.classList.add('active');
            this.renderPersonDetails(person);

            // On mobile, collapse the sidebar when showing person details
            if (isMobile) {
                document.querySelector('.workspace-sidebar').classList.remove('expanded');
            }
        }
    }

    renderPersonDetails(person) {
        if (!person) return;
        
        const panel = document.getElementById('person-details-panel');
        const content = panel.querySelector('.panel-content');
        
        // Format dates for display
        const birthDate = person.birthDate ? this.formatDate(person.birthDate) : 'Unknown';
        const deathDate = person.deathDate ? this.formatDate(person.deathDate) : person.birthDate ? 'Living' : 'Unknown';
        
        // Create the HTML content
        content.innerHTML = `
            <div class="person-details">
                <h3>${person.firstName} ${person.middleName ? person.middleName + ' ' : ''}${person.lastName}</h3>
                ${person.maidenName ? `<div class="maiden-name">née ${person.maidenName}</div>` : ''}
                
                <div class="details-section">
                    <h4>Personal Information</h4>
                    <div class="detail-item">
                        <span class="label">Gender:</span> ${person.gender || 'Unknown'}
                    </div>
                    <div class="detail-item">
                        <span class="label">Birth:</span> ${birthDate}
                        ${person.birthLocation ? ` in ${person.birthLocation}` : ''}
                    </div>
                    <div class="detail-item">
                        <span class="label">Death:</span> ${deathDate}
                        ${person.deathLocation ? ` in ${person.deathLocation}` : ''}
                    </div>
                </div>
                
                ${person.notes ? `
                <div class="details-section">
                    <h4>Notes</h4>
                    <div class="notes">${person.notes}</div>
                </div>
                ` : ''}
                
                <div class="details-section">
                    <h4>Relationships</h4>
                    <div class="relationships-list">
                        ${this.renderPersonRelationships(person)}
                    </div>
                </div>
                
                <div class="details-actions">
                    <button class="btn btn-outline btn-sm" id="edit-person-btn">
                        <span class="material-symbols-rounded">edit</span>
                        Edit
                    </button>
                    <button class="btn btn-outline btn-sm" id="delete-person-btn">
                        <span class="material-symbols-rounded">delete</span>
                        Delete
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners for person links
        content.querySelectorAll('.person-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const personId = link.dataset.id;
                if (personId) {
                    const linkedPerson = this.currentTree.nodes.find(node => node.id === personId);
                    if (linkedPerson) {
                        this.selectPerson(linkedPerson);
                    }
                }
            });
        });
        
        // Add event listeners for action buttons
        const editBtn = content.querySelector('#edit-person-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                // TODO: Implement edit functionality
                this.showNotification('Edit functionality coming soon', 'info');
            });
        }
        
        const deleteBtn = content.querySelector('#delete-person-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete ${person.firstName} ${person.lastName}?`)) {
                    this.deletePerson(person.id);
                }
            });
        }
    }

    renderPersonRelationships(person) {
        if (!person || !this.currentTree || !this.currentTree.nodes) {
            return '<p class="no-relationships">No relationships available</p>';
        }
        
        // Get relationships from this person
        const directRelationships = person.relationships || [];
        
        // Get relationships where this person is the target
        const inverseRelationships = [];
        this.currentTree.nodes.forEach(otherPerson => {
            if (otherPerson.id === person.id) return;
            
            if (otherPerson.relationships && Array.isArray(otherPerson.relationships)) {
                otherPerson.relationships.forEach(rel => {
                    if (rel.personId === person.id) {
                        inverseRelationships.push({
                            type: rel.type,
                            personId: otherPerson.id,
                            details: rel.details,
                            isInverse: true
                        });
                    }
                });
            }
        });
        
        // Combine all relationships
        const allRelationships = [...directRelationships, ...inverseRelationships];
        
        if (!allRelationships.length) {
            return '<p class="no-relationships">No relationships added yet</p>';
        }
        
        // Render each relationship
        return allRelationships.map(rel => {
            // Find the other person
            const otherPersonId = rel.personId;
            const otherPerson = this.currentTree.nodes.find(node => node.id === otherPersonId);
            
            if (!otherPerson) return '';
            
            // Determine relationship label based on type and direction
            let relationshipLabel = rel.type;
            if (rel.isInverse) {
                // Invert the relationship label for inverse relationships
                switch (rel.type) {
                    case 'parent': relationshipLabel = 'child'; break;
                    case 'child': relationshipLabel = 'parent'; break;
                    // Spouse and sibling are symmetric
                }
            }
            
            // Format the relationship display
            return `
                <div class="relationship-detail">
                    <div class="relationship-type ${relationshipLabel}">${relationshipLabel}</div>
                    <a href="#" class="person-link" data-id="${otherPerson.id}">
                        ${otherPerson.firstName} ${otherPerson.lastName}
                    </a>
                    ${rel.details ? `<div class="relationship-details">${rel.details}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    // Update zoom level display
    updateZoomLevel() {
        const zoomLevel = document.querySelector('.zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
        }
    }

    // Update layout handling
    setupLayoutButtons() {
        document.querySelectorAll('[data-layout]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-layout]').forEach(b => b.classList.remove('active'));
                e.target.closest('.tool-btn').classList.add('active');
                this.changeLayout(e.target.closest('.tool-btn').dataset.layout);
            });
        });
    }

    changeLayout(layout) {
        document.getElementById('layout-type').value = layout;
        this.renderTree();
    }

    // Add close button handler for person details panel
    setupPersonDetailsPanel() {
        const panel = document.getElementById('person-details-panel');
        const closeBtn = panel.querySelector('.close-panel-btn');
        
        closeBtn.addEventListener('click', () => {
            panel.classList.remove('active');
            this.selectedNode = null;
        });

        let startX = 0;
        let currentX = 0;

        panel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentX = startX;
            panel.style.transition = 'none';
        });

        panel.addEventListener('touchmove', (e) => {
            const deltaX = e.touches[0].clientX - currentX;
            currentX = e.touches[0].clientX;
            
            if (deltaX > 0) { // Only allow swipe right to close
                const transform = Math.min(currentX - startX, 0);
                panel.style.transform = `translateX(${transform}px)`;
            }
        });

        panel.addEventListener('touchend', () => {
            panel.style.transition = 'transform 0.3s ease';
            const threshold = panel.offsetWidth * 0.3;
            
            if (currentX - startX > threshold) {
                panel.classList.remove('active');
                this.selectedNode = null;
            } else {
                panel.style.transform = '';
            }
        });
    }

    // Update display options handling
    setupDisplayOptions() {
        // Initialize switches
        document.querySelectorAll('.custom-switch input').forEach(switchInput => {
            switchInput.addEventListener('change', (e) => {
                this.updateDisplayOptions(e.target.id, e.target.checked);
            });
        });

        // Load saved display options from localStorage
        const savedOptions = JSON.parse(localStorage.getItem('familyTreeDisplayOptions') || '{}');
        Object.entries(savedOptions).forEach(([id, checked]) => {
            const input = document.getElementById(id);
            if (input) {
                input.checked = checked;
                this.updateDisplayOptions(id, checked, false);
            }
        });
    }

    updateDisplayOptions(id, checked, save = true) {
        // Update the switch state
        const input = document.getElementById(id);
        if (input) {
            input.checked = checked;
        }
        
        // Save to localStorage if needed
        if (save) {
            const savedOptions = JSON.parse(localStorage.getItem('familyTreeDisplayOptions') || '{}');
            savedOptions[id] = checked;
            localStorage.setItem('familyTreeDisplayOptions', JSON.stringify(savedOptions));
        }
        
        // Re-render the tree to reflect changes
        this.renderTree();
    }

    // Initialize the Family Tree Creator
    static init() {
        window.familyTreeCreator = new FamilyTreeCreator();
    }

    setupMobileInteractions() {
        const sidebar = document.querySelector('.workspace-sidebar');
        const sidebarToggle = document.createElement('div');
        sidebarToggle.className = 'sidebar-toggle';
        sidebar.insertBefore(sidebarToggle, sidebar.firstChild);

        // Handle sidebar drag
        let startY = 0;
        let startTransform = 0;
        let isDragging = false;

        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            startY = touch.clientY;
            startTransform = sidebar.getBoundingClientRect().top;
            isDragging = true;
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const deltaY = touch.clientY - startY;
            const newTop = Math.max(0, Math.min(window.innerHeight - 50, startTransform + deltaY));
            sidebar.style.transform = `translateY(${newTop}px)`;
        };

        const handleTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            const currentTop = sidebar.getBoundingClientRect().top;
            const threshold = window.innerHeight * 0.3;
            
            if (currentTop > threshold) {
                sidebar.style.transform = 'translateY(calc(100% - 50px))';
                sidebar.classList.remove('expanded');
            } else {
                sidebar.style.transform = 'translateY(0)';
                sidebar.classList.add('expanded');
            }
        };

        sidebarToggle.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);

        // Double tap to zoom
        let lastTap = 0;
        this.canvas.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 500 && tapLength > 0) {
                // Double tap detected
                e.preventDefault();
                this.handleDoubleTap(e.changedTouches[0]);
            }
            lastTap = currentTime;
        });

        // Pinch to zoom
        let initialDistance = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = this.getDistance(e.touches[0], e.touches[1]);
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
                const delta = currentDistance / initialDistance;
                this.scale = Math.min(2, Math.max(0.5, this.scale * delta));
                this.updateCanvasTransform();
                this.updateZoomLevel();
                initialDistance = currentDistance;
            }
        });
    }

    handleDoubleTap(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.scale = this.scale === 1 ? 1.5 : 1;
        this.offsetX = this.scale === 1 ? 0 : -(x * 0.5);
        this.offsetY = this.scale === 1 ? 0 : -(y * 0.5);
        
        this.updateCanvasTransform();
        this.updateZoomLevel();
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    clearCanvas() {
        const canvas = document.getElementById('tree-canvas');
        const detailsPanel = document.getElementById('person-details-panel');
        
        // Clear canvas content
        while (canvas.firstChild) {
            if (!canvas.firstChild.classList || !canvas.firstChild.classList.contains('empty-state')) {
                canvas.removeChild(canvas.firstChild);
            } else {
                break;
            }
        }
        
        // Reset transform
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.updateCanvasTransform();
        this.updateZoomLevel();
        
        // Hide details panel
        detailsPanel.classList.remove('active');
        this.selectedNode = null;
    }

    loadUserMenu() {
        // Load the user menu if the container exists
        const headerContainer = document.getElementById('header-container');
        if (headerContainer && typeof loadHeader === 'function') {
            loadHeader(headerContainer);
        }
    }

    deletePerson(personId) {
        try {
            if (!this.currentTree || !this.currentTree.nodes) {
                throw new Error('No active tree');
            }
            
            // Find the person's index
            const personIndex = this.currentTree.nodes.findIndex(node => node.id === personId);
            if (personIndex === -1) {
                throw new Error('Person not found');
            }
            
            // Get the person for notification
            const person = this.currentTree.nodes[personIndex];
            
            // Remove the person from the nodes array
            this.currentTree.nodes.splice(personIndex, 1);
            
            // Remove relationships to this person from other people
            this.currentTree.nodes.forEach(node => {
                if (node.relationships && Array.isArray(node.relationships)) {
                    node.relationships = node.relationships.filter(rel => rel.personId !== personId);
                }
            });
            
            // Close the details panel
            document.getElementById('person-details-panel').classList.remove('active');
            this.selectedNode = null;
            
            // Re-render the tree
            this.renderTree();
            
            // Save the changes
            this.saveTree();
            
            // Show notification
            this.showNotification(`${person.firstName} ${person.lastName} has been deleted`, 'success');
        } catch (error) {
            console.error('Error deleting person:', error);
            this.showNotification('Failed to delete person: ' + error.message, 'error');
        }
    }

    centerOnNode(node) {
        const rect = node.getBoundingClientRect();
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        const targetX = -(rect.left - containerRect.left - (containerRect.width - rect.width) / 2) / this.scale;
        const targetY = -(rect.top - containerRect.top - (containerRect.height - rect.height) / 2) / this.scale;
        
        // Animate the transition
        this.animateTransform(targetX, targetY);
    }

    animateTransform(targetX, targetY) {
        const startX = this.offsetX;
        const startY = this.offsetY;
        const startTime = performance.now();
        const duration = 500; // Animation duration in milliseconds

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out function
            const easeOut = (t) => 1 - Math.pow(1 - t, 3);
            const easeProgress = easeOut(progress);
            
            this.offsetX = startX + (targetX - startX) * easeProgress;
            this.offsetY = startY + (targetY - startY) * easeProgress;
            
            this.updateCanvasTransform();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    toggleMinimap() {
        if (!this.minimap) {
            this.createMinimap();
        } else {
            this.minimap.remove();
            this.minimap = null;
        }
    }

    createMinimap() {
        this.minimap = document.createElement('div');
        this.minimap.className = 'minimap';
        this.minimap.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 200px;
            height: 150px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            overflow: hidden;
            z-index: 1000;
        `;
        
        // Create minimap content
        const content = document.createElement('div');
        content.className = 'minimap-content';
        content.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            transform-origin: 0 0;
        `;
        
        // Create viewport indicator
        const viewport = document.createElement('div');
        viewport.className = 'minimap-viewport';
        viewport.style.cssText = `
            position: absolute;
            border: 2px solid var(--accent);
            background: rgba(0, 33, 71, 0.1);
            pointer-events: none;
        `;
        
        this.minimap.appendChild(content);
        this.minimap.appendChild(viewport);
        document.body.appendChild(this.minimap);
        
        this.updateMinimap();
    }

    updateMinimap() {
        if (!this.minimap) return;
        
        const content = this.minimap.querySelector('.minimap-content');
        const viewport = this.minimap.querySelector('.minimap-viewport');
        
        // Calculate scale for minimap
        const canvasRect = this.canvas.getBoundingClientRect();
        const minimapRect = this.minimap.getBoundingClientRect();
        const scale = Math.min(
            minimapRect.width / canvasRect.width,
            minimapRect.height / canvasRect.height
        );
        
        // Update content transform
        content.style.transform = `scale(${scale})`;
        
        // Update viewport indicator
        const viewportWidth = (minimapRect.width / canvasRect.width) * minimapRect.width;
        const viewportHeight = (minimapRect.height / canvasRect.height) * minimapRect.height;
        const viewportX = (-this.offsetX / canvasRect.width) * minimapRect.width;
        const viewportY = (-this.offsetY / canvasRect.height) * minimapRect.height;
        
        viewport.style.width = `${viewportWidth}px`;
        viewport.style.height = `${viewportHeight}px`;
        viewport.style.left = `${viewportX}px`;
        viewport.style.top = `${viewportY}px`;
        
        // Schedule next update
        requestAnimationFrame(() => this.updateMinimap());
    }

    showQuickNavigation() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Quick Navigation</h3>
                    <button class="close-modal-btn">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-container">
                        <input type="text" placeholder="Search for a person..." id="quick-nav-search">
                        <button class="search-btn">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                    </div>
                    <div id="quick-nav-results" class="quick-nav-results"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const searchInput = modal.querySelector('#quick-nav-search');
        const resultsContainer = modal.querySelector('#quick-nav-results');
        
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const results = this.currentTree.nodes.filter(node => 
                `${node.firstName} ${node.lastName}`.toLowerCase().includes(query)
            );
            
            resultsContainer.innerHTML = results.map(person => `
                <div class="quick-nav-item" data-id="${person.id}">
                    <div class="quick-nav-photo">
                        ${person.photoUrl ? 
                            `<img src="${person.photoUrl}" alt="${person.firstName}">` :
                            '<span class="material-symbols-rounded">person</span>'
                        }
                    </div>
                    <div class="quick-nav-info">
                        <div class="quick-nav-name">${person.firstName} ${person.lastName}</div>
                        <div class="quick-nav-details">
                            ${person.birthDate || ''} ${person.birthLocation || ''}
                        </div>
                    </div>
                </div>
            `).join('');
            
            resultsContainer.querySelectorAll('.quick-nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    const personId = item.dataset.id;
                    const node = document.getElementById(`person-${personId}`);
                    if (node) {
                        this.centerOnNode(node);
                        modal.remove();
                    }
                });
            });
        });
        
        modal.querySelector('.close-modal-btn').addEventListener('click', () => {
            modal.remove();
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', FamilyTreeCreator.init); 